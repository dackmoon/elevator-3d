# Elevator 3D — 20 层沉浸式 3D 电梯模拟

一款在浏览器中即开即玩的 **第一人称沉浸式 3D 电梯互动体验**（支持桌面端与 iPad 多点触控）。  
采用 **Three.js + TypeScript + Vite** 零建模纯代码构建高精度电梯轿厢，结合 **AI 照片级 20 层门外实景（Qwen-Image）**、**雨夜观光玻璃井道** 以及 **全套中文真人电梯语音播报（CosyVoice2）与 Web Audio 拟真机械音效**，还原高端摩天大厦乘梯的每一处质感与好奇心。

---

## 精选实景预览

| 1F · 现代大堂 | 10F · 空中连廊 |
| :---: | :---: |
| ![1F 现代大堂](./public/panoramas/floor-02-1f.jpg) | ![10F 空中连廊](./public/panoramas/floor-11-10f.jpg) |

| 15F · 空中温室 | 18F · 星空天台 |
| :---: | :---: |
| ![15F 空中温室](./public/panoramas/floor-16-15f.jpg) | ![18F 星空天台](./public/panoramas/floor-19-18f.jpg) |

---

## 核心特性

- **20 层高速观光电梯（`B2 ~ 18F`）**
  - 宽体 **4×5 物理按钮控制面板（COP）**：悬停高亮、物理下陷回弹动画、发光光环，支持多楼层连续排队与**双击取消已选楼层**。
  - **5 大可交互机关**：`开门 (◄►)`、`关门 (►◄)`、`紧急警铃 (🔔 频闪红灯+警铃+呼叫播报)`、`照明/应急模式切换 (☀)`、`顶部换气扇 (✳ 扇叶惯性旋转+风噪)`。
  - **真实 LOOK 顺路调度状态机**与梯形加减速运动学，启停瞬间带垂直惯性顿挫与高速运行微震体感。
- **20 个独一无二的门外实景世界**
  - `B2 地下车库` → `B1 设备机房` → `1F 现代大堂` → `2F 午夜咖啡吧` → `3F 健身俱乐部` → `4F 共享办公区` → `5F 静谧图书馆` → `6F 创意工作室` → `7F 科技研发层` → `8F 空中餐厅` → `9F 深夜写字楼` → `10F 空中连廊` → `11F 金融交易层` → `12F 霓虹画廊` → `13F 禅意水景厅` → `14F 私享放映厅` → `15F 空中温室` → `16F 云端酒吧` → `17F 行政会所` → `18F 星空天台`。
  - 采用 **1664:928 原图等比曲面巨幕 + 3D 门外延伸地板 + 单层隔离渲染**，杜绝层间穿帮与闪烁，并保留每层色温环境光向轿厢内自然溢出。
- **全景观光雨夜后窗**
  - 自定义 **GLSL 动态雨滴着色器**（水珠滑落与霓虹折射，右上角一键切换 `🌧 雨夜 / 🌙 晴夜`）。
  - 窗外 80 米观光井道钢架、钢索、巨型发光楼层牌、48 栋夜间灯火玻璃幕墙摩天楼、高架双向流动车河、飘动高空夜雾与繁星视差。
- **电影级光影渲染 + 拟真声效与中文语音**
  - `RoomEnvironment` 物理环境反射 + `UnrealBloomPass` 柔和后期辉光 + ACES Filmic 色调映射。
  - **Web Audio API 实时合成全套机械音效**：按键清脆“咔哒”、滑轨开关门与合拢轻碰、变频曳引机低鸣、上下行音阶各异的到站“叮—咚”、警铃、继电器开关、排风扇与雨夜白噪。
  - **全套 24 条中文真人电梯播报**（关门提示、电梯上行/下行、20 层精准报站、应急呼叫），内置吸顶喇叭 EQ 与智能排队防重叠。
- **桌面端 & iPad 触控双优**
  - 自然“抓着画面拖过去”的环顾方向与沉稳灵敏度；支持 **iPad 单指拖拽环顾、双指捏合缩放、精准防误触点击按钮** 与 Safari 音频自动解锁。

---

## 操作指南

| 操作 | 桌面端 | iPad / 触控屏 |
| --- | --- | --- |
| 选层 / 开关门 / 触发机关 | 左键单击按钮 | 单指轻点按钮 |
| 取消已选楼层 | 左键双击已亮楼层键 | 单指双击已亮楼层键 |
| 360° 环顾轿厢 | 左键拖动画布 | 单指拖动画布 |
| 调整视野缩放（FOV） | 鼠标滚轮 | 双指捏合 / 张开 |
| 快捷视角切换 | 底部 `默认 / 特写面板 / 楼层指南 / 观光后窗` | 同左 |

**键盘快捷键**：`1`~`9`（1F~9F）、`0`（10F）、`-`（B2）、`=`（B1）、`O`（开门）、`C`（关门）、`L`（应急灯）、`F`（换气扇）、`R`（重置默认视角）、`M`（静音）。

---

## 快速开始

### 1. 安装依赖并本地启动

```bash
npm install
npm run dev
```

默认运行在 `http://localhost:5173`，打包生产静态产物：

```bash
npm run build
```

### 2. AI 外景图与语音重新生成（可选）

仓库已包含全部 20 张高清实景图与 24 条中文电梯语音，**开箱即用无需 API Key**。  
如需重新抽卡某层图片或更换语音音色，复制 `.env.example` 为 `.env.local` 并填入你的 [硅基流动（SiliconFlow）](https://siliconflow.cn/) API Key：

```bash
cp .env.example .env.local
```

常用生成命令：

```bash
# 仅试生 3 个招牌层（B2 / 1F / 18F）
npm run gen:sample

# 补齐所有缺失楼层实景图（自动跳过已有文件）
npm run gen:floors

# 强制重绘指定楼层（例如 1F 和 18F）
npm run gen:floors -- --force --floors=1F,18F

# 重新合成全部 24 条电梯语音（CosyVoice2-0.5B）
npm run gen:voice -- --force
```

---

## 项目结构

```text
elevator-3d/
├── docs/
│   ├── PROJECT_OVERVIEW.md       # 项目架构、场景坐标系与设计概要
│   └── ASSETS_AND_DEPLOY.md      # 硅基流动 AI 资产生成与服务器部署指南
├── public/
│   ├── panoramas/                # 20 层 1664×928 实景图与 manifest.json
│   └── audio/voice/              # 24 条中文电梯播报 MP3 与 manifest.json
├── scripts/
│   ├── floor-prompts.mjs         # 20 层写实建筑摄影提示词配置
│   ├── generate-floor-images.mjs # 硅基流动生图批量下载与清单同步脚本
│   └── generate-voice-clips.mjs  # 硅基流动 TTS 语音批量合成脚本
├── src/
│   ├── main.ts                   # 渲染管线（RoomEnvironment + Bloom）与主循环
│   ├── types.ts                  # 20 层定义表与全局类型
│   ├── core/
│   │   ├── ElevatorFSM.ts        # LOOK 顺路调度状态机与加减速运动学
│   │   ├── CameraRig.ts          # 桌面/iPad 多点触控摄像机与启停惯性体感
│   │   └── Interaction.ts        # 3D 射线检测交互控制器
│   ├── scene/
│   │   ├── ElevatorCabin.ts      # 3D 轿厢、双层联动门、灯光与换气扇
│   │   ├── ControlPanel.ts       # 4×5 物理按钮面板与按压回弹动画
│   │   ├── FloorDisplay.ts       # Canvas 动态 LED 点阵楼层显示屏
│   │   ├── FloorWorlds.ts        # 20 层门外世界、80m 观光井道与都市夜景
│   │   ├── FloorBackdropManager.ts # 静态照片曲面巨幕与无缝过渡地板加载器
│   │   └── RainGlassShader.ts    # 后窗动态雨滴折射 GLSL 着色器
│   ├── audio/
│   │   └── SoundEngine.ts        # Web Audio 机械音效合成 + 语音播报引擎
│   ├── ui/
│   │   └── HudOverlay.ts         # 玻璃态状态胶囊、视角切换、雨夜与静音控件
│   └── utils/
│       └── textures.ts           # 程序化喷砂金属、胡桃木、大理石与楼层指南贴图
├── .env.example                  # 硅基流动 API 配置模板
└── package.json
```

---

## 详细文档

- 架构设计与模块细节见 [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md)
- AI 实景/语音定制调优与 Linux `systemd` 部署流程见 [`docs/ASSETS_AND_DEPLOY.md`](./docs/ASSETS_AND_DEPLOY.md)
