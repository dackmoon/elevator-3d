# AI 资产生成与生产部署指南

本文档记录 **Elevator 3D** 的硅基流动（SiliconFlow）图片/语音自动化生成工具链、调优经验，以及 Linux 服务器（`systemd`）生产部署流程。

---

## 1. 环境配置（`.env.local`）

在项目根目录创建 `.env.local`（已被 `.gitignore` 忽略，**切勿提交到 Git**）：

```env
# 必填：硅基流动 API Key
SILICONFLOW_API_KEY=sk-your-key-here

# 门外实景生图配置（推荐 Qwen/Qwen-Image 16:9 高清宽幅）
SILICONFLOW_MODEL=Qwen/Qwen-Image
SILICONFLOW_IMAGE_SIZE=1664x928
SILICONFLOW_STEPS=35
SILICONFLOW_CFG=4.0
SILICONFLOW_API_URL=https://api.siliconflow.cn/v1/images/generations

# 电梯播报语音配置（推荐 CosyVoice2-0.5B 单人标准播报）
SILICONFLOW_TTS_URL=https://api.siliconflow.cn/v1/audio/speech
SILICONFLOW_TTS_MODEL=FunAudioLLM/CosyVoice2-0.5B
SILICONFLOW_TTS_VOICE=FunAudioLLM/CosyVoice2-0.5B:claire
SILICONFLOW_TTS_SPEED=0.95
```

---

## 2. 门外 20 层实景图片生成（`scripts/generate-floor-images.mjs`）

### 常用命令

```bash
# 试生 3 个典型楼层（B2 / 1F / 18F）
npm run gen:sample

# 3 路并发补齐所有缺失楼层（已有图片自动跳过，支持限流重试）
npm run gen:floors

# 仅重绘指定楼层（如不满意某层构图时单独抽卡）
npm run gen:floors -- --force --floors=1F,18F

# 手动替换图片后，仅重新扫描 public/panoramas/ 更新 manifest.json（带防缓存时间戳）
npm run gen:sync
```

### 实战调优经验
1. **避免画面中出现多余的“假电梯门框”**：
   - 生图模型对正向提示词里的 `elevator` / `doorway` / `doorframe` 极度敏感，即使写 `no elevator doors` 也容易条件反射把门框画进去。
   - **正确做法**：正向提示词（`scripts/floor-prompts.mjs`）完全不出现 `elevator/door` 等词，只描述平视建筑空间与居中水平地平线；将 `elevator, lift, doorframe, sliding doors, person, silhouette` 集中在 `negative_prompt` 中排除。
2. **临时 URL 过期处理**：
   - 硅基流动生图返回的图片 URL 仅 1 小时有效；脚本会自动传 `X-Enable-Watermark: 0` 并在生成后立即下载落地到 `public/panoramas/floor-XX-xxx.jpg`，同时刷新 `public/panoramas/manifest.json` 的 `?v=<mtime>` 防浏览器缓存。
3. **接入 360° 全景图**：
   - 如果未来某层生成了 2:1 的 360° 全景图，只需在 `src/scene/FloorBackdropManager.ts` 的 `MANUAL_FLOOR_BACKDROPS` 中将其 `mode` 设为 `'panorama'` 即可无缝切换为全景球体投影。

---

## 3. 中文电梯语音合成（`scripts/generate-voice-clips.mjs`）

### 常用命令

```bash
# 仅生成缺失语音
npm run gen:voice

# 更换模型或音色后强制全量重录全部 24 条
npm run gen:voice -- --force
```

### 模型选型经验
- **强烈推荐使用 `FunAudioLLM/CosyVoice2-0.5B`**（默认女声音色 `claire`，语速 `0.95`）：
  - 对极短中文播报（如“电梯上行。” 1.4s、“电梯下行。” 1.1s、“一层，现代大堂到了。” 2.4s）字正腔圆、时长极其精准、零幻觉杂音。
- **不建议用 `fnlp/MOSS-TTSD-v0.5` 生成短句报站**：
  - `MOSS-TTSD` 面向双人长对话播客（需 `[S1]/[S2]` 标签），输入 4~10 字短句时容易产生严重幻觉续写与杂音（4 字会被拖长到 5 秒）。

---

## 4. 服务器生产部署（Linux + `systemd`）

本项目打包后为纯静态 Web 资源（`dist/`，包含 `panoramas/` 和 `audio/voice/`），部署极其轻量稳定。

### 首次部署步骤

```bash
cd /home/workspace
git clone https://github.com/dackmoon/elevator-3d.git
cd elevator-3d

# 安装依赖并构建生产产物（需要 Node 20+）
npm ci --no-audit --no-fund
npm run build
```

创建 `systemd` 常驻托管服务 `/etc/systemd/system/elevator-3d.service`（以 80 端口为例，如与其他服务冲突可按需改端口）：

```ini
[Unit]
Description=Elevator 3D Static Web Server (port 80)
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/workspace/elevator-3d/dist
ExecStart=/usr/bin/python3 -m http.server 80 --bind 0.0.0.0 --directory /home/workspace/elevator-3d/dist
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启用并启动服务：

```bash
systemctl daemon-reload
systemctl enable --now elevator-3d.service
systemctl status elevator-3d.service
```

### 日常代码/资产更新流程

```bash
cd /home/workspace/elevator-3d
git pull origin main
npm ci --no-audit --no-fund   # 仅当 package.json 有变更时需要
npm run build
# 纯静态文件替换后立刻生效，必要时可重启服务：
systemctl restart elevator-3d.service
```

> **安全提醒**：服务器生产环境只需提供编译后的静态产物与已生成的图片/音频，**不需要在服务器上放置 `.env.local` 或 `SILICONFLOW_API_KEY`**。
