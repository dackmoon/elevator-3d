import * as THREE from 'three';
import { FLOORS } from '../types';

/**
 * 程序化生成细腻哑光喷砂/微拉丝不锈钢贴图（远看平整干净，近看有柔和质感）
 */
export function createBrushedMetalTexture(
  baseHex = '#b8c0c8',
  _streakIntensity = 18,
  horizontal = false
): THREE.CanvasTexture {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, width, height);

  // Broad, gentle metallic sheen gradient
  const grad = ctx.createLinearGradient(0, 0, horizontal ? 0 : width, horizontal ? height : 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.035)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.025)');
  grad.addColorStop(1, 'rgba(255,255,255,0.035)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle bead-blasted matte micro-grain (eliminates harsh vertical striping)
  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.022;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Very delicate, short hairline brushed strokes (ultra-low contrast)
  for (let i = 0; i < 220; i++) {
    const alpha = Math.random() * 0.024;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    if (horizontal) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillRect(x, y, 40 + Math.random() * 140, 1);
    } else {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillRect(x, y, 1, 40 + Math.random() * 140);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 程序化生成温润细腻胡桃木饰面贴图（柔和宽纹，无杂乱竖条）
 */
export function createWoodPanelTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#503524');
  grad.addColorStop(0.5, '#593b28');
  grad.addColorStop(1, '#4e3322');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Soft wide organic wood grain bands
  for (let i = 0; i < 95; i++) {
    const x = Math.random() * width;
    const w = 3 + Math.random() * 8;
    const dark = Math.random() > 0.45;
    ctx.strokeStyle = dark
      ? `rgba(28, 15, 8, ${0.035 + Math.random() * 0.045})`
      : `rgba(175, 128, 88, ${0.025 + Math.random() * 0.035})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    const wave = (Math.random() - 0.5) * 18;
    ctx.bezierCurveTo(x + wave, height * 0.33, x - wave, height * 0.66, x + wave * 0.5, height);
    ctx.stroke();
  }

  // Subtle decorative horizontal seam
  ctx.fillStyle = 'rgba(20, 10, 5, 0.28)';
  ctx.fillRect(0, height * 0.5 - 1.5, width, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 程序化生成大理石拼花地板贴图
 */
export function createMarbleFloorTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark granite base
  ctx.fillStyle = '#252930';
  ctx.fillRect(0, 0, size, size);

  // Tile grid 2x2
  const half = size / 2;
  const tileColors = ['#2b3038', '#252a32', '#262b33', '#2d323b'];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = tileColors[r * 2 + c];
      ctx.fillRect(c * half + 3, r * half + 3, half - 6, half - 6);
    }
  }

  // Subtle stone veins
  for (let i = 0; i < 65; i++) {
    ctx.strokeStyle =
      Math.random() > 0.3
        ? `rgba(210, 218, 230, ${0.03 + Math.random() * 0.06})`
        : `rgba(160, 145, 115, ${0.03 + Math.random() * 0.05})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.6;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * 90;
      y += (Math.random() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Fine mineral speckles
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
  }

  // Grout lines
  ctx.strokeStyle = '#15181d';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, size, size);
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half, size);
  ctx.moveTo(0, half);
  ctx.lineTo(size, half);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 生成物理按钮表面高清晰度贴图
 */
export function createButtonCapTexture(
  label: string,
  options?: { color?: string; fontSize?: number; subText?: string }
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Brushed metallic button face
  const rad = ctx.createRadialGradient(size * 0.42, size * 0.38, 12, size * 0.5, size * 0.5, size * 0.52);
  rad.addColorStop(0, '#3e444e');
  rad.addColorStop(0.65, '#272c34');
  rad.addColorStop(1, '#181c22');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric ring
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.stroke();

  // Main label
  const fontSize = options?.fontSize ?? (label.length > 1 ? 94 : 112);
  ctx.fillStyle = options?.color ?? '#f3f6fb';
  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, options?.subText ? size * 0.46 : size * 0.52);

  if (options?.subText) {
    ctx.fillStyle = 'rgba(220, 230, 245, 0.72)';
    ctx.font = `600 28px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(options.subText, size / 2, size * 0.77);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * 生成左墙“楼层指南 Directory”高级双列铭牌贴图（适配 20 层高层建筑）
 */
export function createDirectoryTexture(): THREE.CanvasTexture {
  const width = 768;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Dark anodized aluminum plate
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#181c24');
  bg.addColorStop(1, '#101319');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Inner brass border
  ctx.strokeStyle = '#c8a97e';
  ctx.lineWidth = 6;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  // Header
  ctx.fillStyle = '#e5cba3';
  ctx.font = '700 34px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FLOOR DIRECTORY · 20 LEVELS', width / 2, 78);

  ctx.fillStyle = '#9aa4b4';
  ctx.font = '500 22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('大 厦 楼 层 索 引 指 南', width / 2, 114);

  ctx.strokeStyle = 'rgba(200, 169, 126, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, 138);
  ctx.lineTo(width - 48, 138);
  ctx.stroke();

  // Center vertical divider
  ctx.strokeStyle = 'rgba(200, 169, 126, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2, 158);
  ctx.lineTo(width / 2, height - 86);
  ctx.stroke();

  // Two columns: Left = top half (18F -> 9F), Right = bottom half (8F -> B2)
  const reversed = [...FLOORS].reverse();
  const half = Math.ceil(reversed.length / 2);
  const startY = 192;
  const rowStep = 70;

  reversed.forEach((f, idx) => {
    const col = idx < half ? 0 : 1;
    const row = idx % half;
    const colLeft = col === 0 ? 52 : width / 2 + 28;
    const colRight = col === 0 ? width / 2 - 28 : width - 52;
    const y = startY + row * rowStep;

    // Accent dot
    ctx.fillStyle = f.accentColor;
    ctx.beginPath();
    ctx.arc(colLeft + 6, y - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Floor code
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 25px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(f.displayLabel, colLeft + 22, y + 4);

    // Chinese name
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(f.nameZh, colLeft + 92, y + 2);

    // Subtle English sub-label
    ctx.fillStyle = '#7c889b';
    ctx.font = '500 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(f.nameEn, colRight, y + 22);

    if (row < half - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colLeft, y + 34);
      ctx.lineTo(colRight, y + 34);
      ctx.stroke();
    }
  });

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '500 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HIGH-SPEED EXPRESS · 1000 KG · MAX 13 PERSONS', width / 2, height - 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * 生成电梯安全铭牌小贴图
 */
export function createPlateTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  ctx.fillStyle = '#d4af7a';
  ctx.font = '700 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('AERO-LIFT SERIES IX', width / 2, 52);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px monospace';
  ctx.fillText('LOAD 1000KG · 13 PERSONS · NO.01', width / 2, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 生成井道内楼层数字大牌贴图
 */
export function createShaftFloorSignTexture(label: string, color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c1018';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, size - 28, size - 28);

  ctx.fillStyle = color;
  ctx.font = '800 104px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, size / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 生成黑黄工业警示条纹贴图
 */
export function createHazardStripeTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#18181b';
  for (let i = -size; i < size * 2; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 32, 0);
    ctx.lineTo(i + 32 - size, size);
    ctx.lineTo(i - size, size);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 写实斑驳混凝土地面 PBR 贴图（颜色 + 凹凸）
 */
export function createConcretePBRTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#333840';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Concrete aggregate blotches
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 6 + Math.random() * 28;
    const dark = Math.random() > 0.5;
    cCtx.fillStyle = dark ? 'rgba(18,20,24,0.08)' : 'rgba(130,140,152,0.06)';
    cCtx.beginPath();
    cCtx.arc(x, y, r, 0, Math.PI * 2);
    cCtx.fill();

    bCtx.fillStyle = dark ? 'rgba(40,40,40,0.12)' : 'rgba(210,210,210,0.1)';
    bCtx.beginPath();
    bCtx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Fine mineral noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = Math.random() > 0.5 ? 255 : 0;
    cCtx.fillStyle = `rgba(${v},${v},${v},0.05)`;
    cCtx.fillRect(x, y, 2, 2);
    bCtx.fillStyle = `rgba(${v},${v},${v},0.14)`;
    bCtx.fillRect(x, y, 2, 2);
  }

  // Expansion joint grid lines
  cCtx.strokeStyle = 'rgba(12,14,18,0.55)';
  cCtx.lineWidth = 3;
  cCtx.strokeRect(1, 1, size - 2, size - 2);
  bCtx.strokeStyle = '#181818';
  bCtx.lineWidth = 4;
  bCtx.strokeRect(1, 1, size - 2, size - 2);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  return { map, bumpMap };
}

/**
 * 写实浅色大理石地面贴图（用于大堂、画廊等明亮空间）
 */
export function createLightMarbleTexture(tintHex = '#e6e1d6'): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, size, size);

  // Natural marble veins
  for (let i = 0; i < 45; i++) {
    ctx.strokeStyle = `rgba(125, 118, 108, ${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.8 + Math.random() * 2.2;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.35) * 110;
      y += (Math.random() - 0.5) * 85;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Subtle tile grout
  ctx.strokeStyle = 'rgba(90, 85, 78, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 写实原木长条拼接地板贴图（咖啡吧、图书馆、行政会所）
 */
export function createWoodPlankTexture(baseHex = '#593b27'): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const plankCount = 8;
  const plankW = size / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const shade = (Math.random() - 0.5) * 24;
    ctx.fillStyle = shade > 0 ? `rgba(255,210,165,${shade / 255})` : `rgba(15,8,4,${-shade / 255})`;
    ctx.fillRect(i * plankW, 0, plankW, size);

    // Fine wood fibers
    for (let g = 0; g < 22; g++) {
      const gx = i * plankW + Math.random() * plankW;
      ctx.strokeStyle = `rgba(25, 12, 5, ${0.06 + Math.random() * 0.12})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx + (Math.random() - 0.5) * 4, size);
      ctx.stroke();
    }

    // Plank seam
    ctx.fillStyle = 'rgba(14, 8, 4, 0.52)';
    ctx.fillRect(i * plankW, 0, 2, size);
    const jointY = ((i * 173) % size);
    ctx.fillRect(i * plankW, jointY, plankW, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 写实都市摩天楼夜间灯火玻璃幕墙贴图（让后窗夜景呈现真实城市建筑群密度）
 */
export function createSkyscraperFacadeTexture(seed = 0): THREE.CanvasTexture {
  const width = 256;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Dark nocturnal glass curtain wall gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0a1222');
  grad.addColorStop(1, '#111c32');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Structural mullion grid
  const cols = 8;
  const rows = 28;
  const cellW = width / cols;
  const cellH = height / rows;

  let s = (seed + 1) * 9301 + 49297;
  const rand = (): number => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let r = 1; r < rows - 1; r++) {
    // Whole-floor office bands occasionally lit
    const floorLitBias = rand() > 0.62 ? 0.55 : 0.14;
    for (let c = 0; c < cols; c++) {
      if (rand() < floorLitBias) {
        const pick = rand();
        const color =
          pick < 0.55
            ? `rgba(255, 224, 155, ${0.55 + rand() * 0.4})`
            : pick < 0.85
              ? `rgba(147, 215, 255, ${0.45 + rand() * 0.45})`
              : `rgba(255, 175, 120, ${0.5 + rand() * 0.35})`;
        ctx.fillStyle = color;
        ctx.fillRect(c * cellW + 4, r * cellH + 4, cellW - 8, cellH - 8);
      } else {
        // Dark reflective glass bay
        ctx.fillStyle = 'rgba(30, 48, 76, 0.35)';
        ctx.fillRect(c * cellW + 4, r * cellH + 4, cellW - 8, cellH - 8);
      }
    }
  }

  // Subtle horizontal concrete floor slabs
  ctx.fillStyle = 'rgba(6, 10, 18, 0.85)';
  for (let r = 0; r < rows; r++) {
    ctx.fillRect(0, r * cellH, width, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 柔和高空夜雾薄云贴图
 */
export function createSoftCloudTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const rad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  rad.addColorStop(0, 'rgba(148, 178, 218, 0.32)');
  rad.addColorStop(0.5, 'rgba(100, 130, 175, 0.14)');
  rad.addColorStop(1, 'rgba(30, 45, 75, 0.0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
