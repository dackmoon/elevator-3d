import * as THREE from 'three';
import { CameraPreset } from '../types';

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'default',
    label: '默认视角',
    yaw: -0.14, // slightly looking right so door + control panel are both in view
    pitch: -0.05,
    fov: 62,
    position: [-0.08, 1.54, 0.44],
  },
  {
    id: 'panel',
    label: '特写面板',
    yaw: -0.15,
    pitch: -0.08,
    fov: 50,
    position: [0.64, 1.46, 0.04],
  },
  {
    id: 'directory',
    label: '楼层指南',
    yaw: Math.PI * 0.5,
    pitch: 0.02,
    fov: 56,
    position: [0.28, 1.6, 0.0],
  },
  {
    id: 'window',
    label: '观光后窗',
    yaw: Math.PI,
    pitch: -0.03,
    fov: 66,
    position: [0, 1.56, -0.18],
  },
];

/**
 * 第一人称沉浸式摄像机控制器（完美适配桌面端鼠标 + iPad/移动端多点触控）
 * - 采用自然“抓着画面拖过去”的拖拽方向（与全景看房/iPad 触控直觉完全一致）
 * - 柔和沉稳的滑动灵敏度与阻尼
 * - 支持双指捏合缩放（iPad/手机）与滚轮缩放（桌面）
 * - 电梯启停惯性顿挫与运行微震体感
 */
export class CameraRig {
  public readonly camera: THREE.PerspectiveCamera;

  private targetYaw: number;
  private targetPitch: number;
  private currentYaw: number;
  private currentPitch: number;

  private targetFov: number;
  private currentFov: number;

  private targetPos = new THREE.Vector3();
  private currentPos = new THREE.Vector3();

  // Motion physics feel
  private inertiaY = 0;
  private inertiaVel = 0;

  // Unified mouse + multi-touch pointer tracking
  private readonly activePointers = new Map<number, { x: number; y: number }>();
  private primaryPointerId: number | null = null;
  private primaryPointerType = 'mouse';
  private pointerDownX = 0;
  private pointerDownY = 0;
  private lastX = 0;
  private lastY = 0;
  private dragDistance = 0;
  private hadMultiTouch = false;
  private lastPinchDist: number | null = null;

  private activePresetId: CameraPreset['id'] = 'default';
  private onPresetChange?: (id: CameraPreset['id'] | null) => void;

  constructor(aspect: number, domElement: HTMLElement, onPresetChange?: (id: CameraPreset['id'] | null) => void) {
    this.onPresetChange = onPresetChange;
    const preset = CAMERA_PRESETS[0];
    this.camera = new THREE.PerspectiveCamera(preset.fov, aspect, 0.08, 110);

    this.targetYaw = preset.yaw;
    this.currentYaw = preset.yaw;
    this.targetPitch = preset.pitch;
    this.currentPitch = preset.pitch;
    this.targetFov = preset.fov;
    this.currentFov = preset.fov;
    this.targetPos.set(...preset.position);
    this.currentPos.set(...preset.position);

    this.bindEvents(domElement);
  }

  public get isDraggingGesture(): boolean {
    if (this.hadMultiTouch) return true;
    const threshold = this.primaryPointerType === 'touch' ? 12 : 6;
    return this.dragDistance > threshold;
  }

  public applyPreset(id: CameraPreset['id']): void {
    const preset = CAMERA_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    this.activePresetId = id;

    // Normalize yaw delta so camera rotates the shortest angular path
    const twoPi = Math.PI * 2;
    const delta = ((preset.yaw - this.currentYaw) % twoPi + twoPi * 1.5) % twoPi - Math.PI;
    this.targetYaw = this.currentYaw + delta;
    this.targetPitch = preset.pitch;
    this.targetFov = preset.fov;
    this.targetPos.set(...preset.position);
    this.onPresetChange?.(id);
  }

  public getActivePreset(): CameraPreset['id'] {
    return this.activePresetId;
  }

  private getPinchDistance(): number | null {
    if (this.activePointers.size < 2) return null;
    const pts = Array.from(this.activePointers.values());
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  private bindEvents(dom: HTMLElement): void {
    dom.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.activePointers.size === 1) {
        this.primaryPointerId = e.pointerId;
        this.primaryPointerType = e.pointerType;
        this.pointerDownX = e.clientX;
        this.pointerDownY = e.clientY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.dragDistance = 0;
        this.hadMultiTouch = false;
        this.lastPinchDist = null;
      } else if (this.activePointers.size >= 2) {
        // Multi-touch pinch zoom started (iPad / touch devices)
        this.hadMultiTouch = true;
        this.lastPinchDist = this.getPinchDistance();
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.activePointers.has(e.pointerId)) return;
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Two-finger pinch to zoom on iPad/touchscreen
      if (this.activePointers.size >= 2) {
        const dist = this.getPinchDistance();
        if (dist !== null && this.lastPinchDist !== null) {
          const delta = dist - this.lastPinchDist;
          this.targetFov = THREE.MathUtils.clamp(this.targetFov - delta * 0.08, 32, 76);
        }
        this.lastPinchDist = dist;
        return;
      }

      // Single-finger / mouse drag pan
      if (e.pointerId !== this.primaryPointerId) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.dragDistance = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);

      const moveDeadzone = e.pointerType === 'touch' ? 6 : 4;
      if (this.dragDistance > moveDeadzone) {
        // Restrained, smooth sensitivity + natural "grab & drag the scene" direction
        const baseSens = e.pointerType === 'touch' ? 0.0022 : 0.0019;
        const sensitivity = baseSens * (this.currentFov / 62);
        this.targetYaw += dx * sensitivity;
        this.targetPitch = THREE.MathUtils.clamp(
          this.targetPitch + dy * sensitivity,
          -Math.PI * 0.44,
          Math.PI * 0.44
        );
        this.onPresetChange?.(null);
      }
    });

    const handlePointerEnd = (e: PointerEvent): void => {
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size < 2) {
        this.lastPinchDist = null;
      }
      if (this.activePointers.size === 1) {
        // Seamlessly hand off remaining finger without view jump
        const [remainingId, pos] = Array.from(this.activePointers.entries())[0];
        this.primaryPointerId = remainingId;
        this.lastX = pos.x;
        this.lastY = pos.y;
      } else if (this.activePointers.size === 0) {
        this.primaryPointerId = null;
      }
    };

    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.targetFov = THREE.MathUtils.clamp(this.targetFov + e.deltaY * 0.025, 32, 76);
      },
      { passive: false }
    );
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * 每帧更新摄像机姿态与电梯加速度物理体感
   */
  public update(
    dt: number,
    elapsed: number,
    elevatorVelocity: number,
    elevatorAcceleration: number,
    maxSpeed = 6.2
  ): void {
    const clampedDt = Math.min(dt, 0.05);
    const smooth = 1 - Math.exp(-8.5 * clampedDt);

    this.currentYaw += (this.targetYaw - this.currentYaw) * smooth;
    this.currentPitch += (this.targetPitch - this.currentPitch) * smooth;
    this.currentPos.lerp(this.targetPos, smooth);

    if (Math.abs(this.targetFov - this.currentFov) > 0.02) {
      this.currentFov += (this.targetFov - this.currentFov) * smooth;
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // Spring-damper vertical inertia feel when elevator accelerates or brakes
    const force = -elevatorAcceleration * 0.013;
    const stiffness = 62;
    const damping = 11.5;
    const springAcc = force - stiffness * this.inertiaY - damping * this.inertiaVel;
    this.inertiaVel += springAcc * clampedDt;
    this.inertiaY = THREE.MathUtils.clamp(this.inertiaY + this.inertiaVel * clampedDt, -0.06, 0.06);

    // Subtle mechanical micro-vibration while moving at speed
    const speedRatio = Math.min(1, Math.abs(elevatorVelocity) / maxSpeed);
    const microShakeX = speedRatio * Math.sin(elapsed * 43) * 0.0014;
    const microShakeY = speedRatio * Math.cos(elapsed * 37) * 0.0016;
    // Gentle human breathing idle sway
    const breathY = Math.sin(elapsed * 1.45) * 0.004;

    this.camera.position.set(
      this.currentPos.x + microShakeX,
      this.currentPos.y + this.inertiaY + microShakeY + breathY,
      this.currentPos.z
    );

    const euler = new THREE.Euler(this.currentPitch, this.currentYaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }
}
