import * as THREE from 'three';
import { ElevatorState, FLOORS, MoveDirection } from '../types';

/**
 * 动态 Canvas LED 点阵楼层显示屏（用于门楣主屏与控制面板副屏）
 */
export class FloorDisplay {
  public readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private lastSignature = '';
  private animPhase = 0;

  constructor(width = 512, height = 144) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;

    this.render(2, 0, 'OPEN', false, false);
  }

  public update(
    dt: number,
    floorIndex: number,
    direction: MoveDirection,
    state: ElevatorState,
    alarmOn: boolean,
    emergencyLight: boolean
  ): void {
    this.animPhase += dt * 4.5;
    const frameStep = Math.floor(this.animPhase) % 4;
    const blink = Math.floor(this.animPhase * 0.8) % 2 === 0;
    const sig = `${floorIndex}|${direction}|${state}|${alarmOn}|${emergencyLight}|${direction !== 0 ? frameStep : 0}|${alarmOn ? blink : 0}`;

    if (sig === this.lastSignature) return;
    this.lastSignature = sig;
    this.render(floorIndex, direction, state, alarmOn, emergencyLight, frameStep, blink);
  }

  private render(
    floorIndex: number,
    direction: MoveDirection,
    state: ElevatorState,
    alarmOn: boolean,
    emergencyLight: boolean,
    frameStep = 0,
    blink = true
  ): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const floor = FLOORS[floorIndex] ?? FLOORS[2];

    // Deep glossy LED glass background
    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, w, h);

    // Faint dot-matrix grid backdrop
    ctx.fillStyle = 'rgba(255, 190, 90, 0.045)';
    for (let y = 10; y < h; y += 10) {
      for (let x = 10; x < w; x += 10) {
        ctx.fillRect(x, y, 3, 3);
      }
    }

    const mainColor = alarmOn
      ? blink
        ? '#ff3b30'
        : '#7f1d1d'
      : emergencyLight
        ? '#ff7849'
        : '#ffb84d';

    // Direction chevron arrow on the left
    const arrowX = 76;
    const arrowY = h / 2;
    ctx.save();
    if (direction !== 0) {
      const offset = direction > 0 ? (1.5 - frameStep) * 6 : (frameStep - 1.5) * 6;
      ctx.fillStyle = mainColor;
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      if (direction > 0) {
        ctx.moveTo(arrowX, arrowY - 28 + offset);
        ctx.lineTo(arrowX + 26, arrowY + 12 + offset);
        ctx.lineTo(arrowX + 10, arrowY + 12 + offset);
        ctx.lineTo(arrowX, arrowY - 4 + offset);
        ctx.lineTo(arrowX - 10, arrowY + 12 + offset);
        ctx.lineTo(arrowX - 26, arrowY + 12 + offset);
      } else {
        ctx.moveTo(arrowX, arrowY + 28 + offset);
        ctx.lineTo(arrowX + 26, arrowY - 12 + offset);
        ctx.lineTo(arrowX + 10, arrowY - 12 + offset);
        ctx.lineTo(arrowX, arrowY + 4 + offset);
        ctx.lineTo(arrowX - 10, arrowY - 12 + offset);
        ctx.lineTo(arrowX - 26, arrowY - 12 + offset);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Standby indicator bars
      ctx.fillStyle = 'rgba(255, 184, 77, 0.25)';
      ctx.fillRect(arrowX - 16, arrowY - 3, 32, 6);
    }
    ctx.restore();

    // Main Floor Number
    ctx.save();
    ctx.fillStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 18;
    ctx.font = '800 84px "SF Mono", "JetBrains Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(floor.displayLabel, 208, h / 2 + 4);
    ctx.restore();

    // Right status & floor title
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    if (alarmOn) {
      ctx.fillStyle = blink ? '#ff453a' : '#991b1b';
      ctx.font = '700 28px monospace';
      ctx.fillText('ALARM ACTIVE', 302, h / 2 - 14);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '600 18px "PingFang SC", sans-serif';
      ctx.fillText('紧急呼叫中...', 302, h / 2 + 22);
    } else {
      const statusText =
        state === 'MOVING'
          ? direction > 0
            ? 'ASCENDING'
            : 'DESCENDING'
          : state === 'OPENING'
            ? 'DOOR OPEN'
            : state === 'CLOSING'
              ? 'DOOR CLOSE'
              : emergencyLight
                ? 'BACKUP PWR'
                : 'STANDBY';

      ctx.fillStyle = emergencyLight ? '#fb923c' : '#94a3b8';
      ctx.font = '700 18px monospace';
      ctx.fillText(statusText, 302, h / 2 - 22);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 24px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(floor.nameZh, 302, h / 2 + 16);
    }
    ctx.restore();

    // Subtle glass scanline sheen
    const sheen = ctx.createLinearGradient(0, 0, 0, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
    sheen.addColorStop(0.45, 'rgba(255,255,255,0.0)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    this.texture.needsUpdate = true;
  }
}
