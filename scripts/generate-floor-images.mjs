import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMON_NEGATIVE_PROMPT, COMMON_STYLE_SUFFIX, FLOOR_PROMPTS } from './floor-prompts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'panoramas');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

/**
 * 简单解析 .env.local 文件（无需额外 dotenv 依赖）
 */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(ROOT_DIR, '.env.local'));
loadEnvFile(path.join(ROOT_DIR, '.env'));

const API_KEY = process.env.SILICONFLOW_API_KEY?.trim();
const API_URL = process.env.SILICONFLOW_API_URL?.trim() || 'https://api.siliconflow.cn/v1/images/generations';
const MODEL = process.env.SILICONFLOW_MODEL?.trim() || 'Qwen/Qwen-Image';
const IMAGE_SIZE = process.env.SILICONFLOW_IMAGE_SIZE?.trim() || '1664x928';
const STEPS = Number(process.env.SILICONFLOW_STEPS || 35);
const CFG = Number(process.env.SILICONFLOW_CFG || 4.0);

// 解析命令行参数：
// --floors=1F,12F,18F  仅生成指定楼层
// --force              强制重新生成已存在图片
// --sync-only          不调用 API，只重新扫描目录更新 manifest.json
const args = process.argv.slice(2);
const forceOverwrite = args.includes('--force');
const syncOnly = args.includes('--sync-only');
const floorsArg = args.find((a) => a.startsWith('--floors='));
const filterSet = floorsArg
  ? new Set(
      floorsArg
        .slice('--floors='.length)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
  : null;

function getImageFilename(floor) {
  const padded = String(floor.index).padStart(2, '0');
  return `floor-${padded}-${floor.displayLabel.toLowerCase()}.jpg`;
}

/**
 * 扫描 public/panoramas 目录，自动重建前端加载所需的 manifest.json
 */
function rebuildManifest() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const floorsMap = {};

  for (const floor of FLOOR_PROMPTS) {
    const filename = getImageFilename(floor);
    const fullPath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 1024) {
      const mtime = Math.floor(fs.statSync(fullPath).mtimeMs);
      floorsMap[floor.index] = {
        url: `/panoramas/${filename}?v=${mtime}`,
        mode: 'wide',
        brightness: 0.96,
        label: floor.displayLabel,
        nameZh: floor.nameZh,
      };
    }
  }

  const manifest = {
    updatedAt: new Date().toISOString(),
    model: MODEL,
    floors: floorsMap,
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  return Object.keys(floorsMap).length;
}

/**
 * 调用硅基流动 POST /v1/images/generations 并立即把 1 小时有效期的临时图片下载到本地
 */
async function generateSingleFloor(floor) {
  const fullPrompt = `${floor.prompt}, ${COMMON_STYLE_SUFFIX}`;
  const isKolors = MODEL.toLowerCase().includes('kolors');
  const isQwenEdit = MODEL.toLowerCase().includes('qwen-image-edit');

  const payload = {
    model: MODEL,
    prompt: fullPrompt,
    negative_prompt: COMMON_NEGATIVE_PROMPT,
    num_inference_steps: STEPS,
  };

  if (!isQwenEdit) {
    payload.image_size = IMAGE_SIZE;
  }
  if (isKolors) {
    payload.guidance_scale = CFG;
  } else if (MODEL.toLowerCase().includes('qwen')) {
    payload.cfg = CFG;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'X-Enable-Watermark': '0',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const imageUrl = json?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error(`返回数据中未找到图片 URL: ${JSON.stringify(json)}`);
  }

  // 立即下载到本地（API 返回的 URL 仅 1 小时有效）
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`下载生成图片失败 HTTP ${imgRes.status}`);
  }
  const arrayBuf = await imgRes.arrayBuffer();
  const destPath = path.join(OUTPUT_DIR, getImageFilename(floor));
  fs.writeFileSync(destPath, Buffer.from(arrayBuf));
  return destPath;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (syncOnly) {
    const count = rebuildManifest();
    console.log(`✅ 已同步 manifest.json，当前已就绪实景楼层数：${count} / ${FLOOR_PROMPTS.length}`);
    return;
  }

  if (!API_KEY) {
    console.error('❌ 未检测到 SILICONFLOW_API_KEY！');
    console.error('请先打开项目根目录的 .env.local 文件，填入你的硅基流动 API Key：');
    console.error('   SILICONFLOW_API_KEY=sk-你的密钥');
    process.exit(1);
  }

  const targets = FLOOR_PROMPTS.filter((f) => {
    if (!filterSet) return true;
    return (
      filterSet.has(f.displayLabel.toUpperCase()) ||
      filterSet.has(f.code.toUpperCase()) ||
      filterSet.has(String(f.index))
    );
  });

  if (targets.length === 0) {
    console.error('❌ --floors 参数未匹配到任何楼层（可选 B2, B1, 1F ~ 18F）');
    process.exit(1);
  }

  console.log(`🚀 硅基流动生图任务启动`);
  console.log(`   模型: ${MODEL} | 分辨率: ${IMAGE_SIZE} | 步数: ${STEPS} | 目标层数: ${targets.length}`);
  console.log('');

  let generatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // 过滤待生成列表
  const pending = [];
  for (const floor of targets) {
    const filename = getImageFilename(floor);
    const fullPath = path.join(OUTPUT_DIR, filename);
    if (!forceOverwrite && fs.existsSync(fullPath) && fs.statSync(fullPath).size > 1024) {
      console.log(`⏭️  [${floor.displayLabel.padEnd(3)}] ${floor.nameZh} — 已存在，跳过`);
      skippedCount++;
    } else {
      pending.push(floor);
    }
  }

  // 3 并发加速生成 + 限流自动重试
  const concurrency = Math.min(3, pending.length || 1);
  let cursor = 0;

  async function worker() {
    while (cursor < pending.length) {
      const floor = pending[cursor++];
      const filename = getImageFilename(floor);
      const start = Date.now();
      let ok = false;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await generateSingleFloor(floor);
          const sec = ((Date.now() - start) / 1000).toFixed(1);
          console.log(`🎨 [${floor.displayLabel.padEnd(3)}] 「${floor.nameZh}」完成 (${sec}s) -> public/panoramas/${filename}`);
          generatedCount++;
          rebuildManifest();
          ok = true;
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (attempt < 2 && (msg.includes('429') || msg.includes('503') || msg.includes('504'))) {
            console.log(`⏳ [${floor.displayLabel.padEnd(3)}] 触发限流/繁忙，5秒后重试...`);
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }
          console.error(`❌ [${floor.displayLabel.padEnd(3)}] 「${floor.nameZh}」失败: ${msg}`);
        }
      }
      if (!ok) failedCount++;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const totalReady = rebuildManifest();
  console.log('');
  console.log(`✨ 任务结束：新生成 ${generatedCount} 张，跳过 ${skippedCount} 张，失败 ${failedCount} 张。`);
  console.log(`📦 manifest.json 已更新，当前已启用照片级实景的楼层：${totalReady} / ${FLOOR_PROMPTS.length}`);
}

main();
