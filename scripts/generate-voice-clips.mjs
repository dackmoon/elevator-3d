import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'audio', 'voice');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

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
const TTS_URL = process.env.SILICONFLOW_TTS_URL?.trim() || 'https://api.siliconflow.cn/v1/audio/speech';
const TTS_MODEL = process.env.SILICONFLOW_TTS_MODEL?.trim() || 'FunAudioLLM/CosyVoice2-0.5B';
const TTS_VOICE = process.env.SILICONFLOW_TTS_VOICE?.trim() || 'FunAudioLLM/CosyVoice2-0.5B:claire';
const TTS_SPEED = Number(process.env.SILICONFLOW_TTS_SPEED || 0.95);

const VOICE_CLIPS = [
  { id: 'door-closing', text: '门正在关闭，请小心。' },
  { id: 'going-up', text: '电梯上行。' },
  { id: 'going-down', text: '电梯下行。' },
  { id: 'alarm-active', text: '正在为您呼叫值班中心，请保持冷静。' },
  { id: 'floor-0', text: '地下二层，地下车库到了。' },
  { id: 'floor-1', text: '地下一层，设备机房到了。' },
  { id: 'floor-2', text: '一层，现代大堂到了。' },
  { id: 'floor-3', text: '二层，午夜咖啡吧到了。' },
  { id: 'floor-4', text: '三层，健身俱乐部到了。' },
  { id: 'floor-5', text: '四层，共享办公区到了。' },
  { id: 'floor-6', text: '五层，静谧图书馆到了。' },
  { id: 'floor-7', text: '六层，创意工作室到了。' },
  { id: 'floor-8', text: '七层，科技研发层到了。' },
  { id: 'floor-9', text: '八层，空中餐厅到了。' },
  { id: 'floor-10', text: '九层，深夜写字楼到了。' },
  { id: 'floor-11', text: '十层，空中连廊到了。' },
  { id: 'floor-12', text: '十一层，金融交易层到了。' },
  { id: 'floor-13', text: '十二层，霓虹画廊到了。' },
  { id: 'floor-14', text: '十三层，禅意水景厅到了。' },
  { id: 'floor-15', text: '十四层，私享放映厅到了。' },
  { id: 'floor-16', text: '十五层，空中温室到了。' },
  { id: 'floor-17', text: '十六层，云端酒吧到了。' },
  { id: 'floor-18', text: '十七层，行政会所到了。' },
  { id: 'floor-19', text: '十八层，星空天台到了。' },
];

const args = process.argv.slice(2);
const forceOverwrite = args.includes('--force');

function rebuildManifest() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const clips = {};
  for (const item of VOICE_CLIPS) {
    const filename = `${item.id}.mp3`;
    const fullPath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 512) {
      const mtime = Math.floor(fs.statSync(fullPath).mtimeMs);
      clips[item.id] = `/audio/voice/${filename}?v=${mtime}`;
    }
  }
  const manifest = {
    updatedAt: new Date().toISOString(),
    model: TTS_MODEL,
    voice: TTS_VOICE,
    clips,
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  return Object.keys(clips).length;
}

async function synthesizeClip(item) {
  const payload = {
    model: TTS_MODEL,
    input: item.text,
    voice: TTS_VOICE,
    response_format: 'mp3',
    speed: TTS_SPEED,
  };

  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 512) {
    throw new Error(`返回音频体积过小 (${buf.length} bytes): ${buf.toString('utf-8').slice(0, 120)}`);
  }

  const dest = path.join(OUTPUT_DIR, `${item.id}.mp3`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!API_KEY) {
    console.error('❌ 未检测到 SILICONFLOW_API_KEY，请检查 .env.local');
    process.exit(1);
  }

  const pending = [];
  let skipped = 0;
  for (const item of VOICE_CLIPS) {
    const dest = path.join(OUTPUT_DIR, `${item.id}.mp3`);
    if (!forceOverwrite && fs.existsSync(dest) && fs.statSync(dest).size > 512) {
      skipped++;
    } else {
      pending.push(item);
    }
  }

  console.log(`🎙️  硅基流动电梯语音合成启动`);
  console.log(`   模型: ${TTS_MODEL} | 音色: ${TTS_VOICE} | 待合成: ${pending.length} 条 (跳过 ${skipped} 条)`);
  console.log('');

  let okCount = 0;
  let failCount = 0;
  let cursor = 0;
  const concurrency = Math.min(3, pending.length || 1);

  async function worker() {
    while (cursor < pending.length) {
      const item = pending[cursor++];
      let ok = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const bytes = await synthesizeClip(item);
          console.log(`✅ [${item.id.padEnd(12)}] 「${item.text}」 (${(bytes / 1024).toFixed(1)} KB)`);
          okCount++;
          rebuildManifest();
          ok = true;
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (attempt < 2 && (msg.includes('429') || msg.includes('503') || msg.includes('504'))) {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          console.error(`❌ [${item.id.padEnd(12)}] 失败: ${msg}`);
        }
      }
      if (!ok) failCount++;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const ready = rebuildManifest();
  console.log('');
  console.log(`✨ 语音合成完成：新生成 ${okCount} 条，跳过 ${skipped} 条，失败 ${failCount} 条。`);
  console.log(`📦 manifest.json 已更新，当前可用语音条数：${ready} / ${VOICE_CLIPS.length}`);
}

main();
