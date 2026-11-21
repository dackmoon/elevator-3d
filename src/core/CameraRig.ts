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
 * 第一人称沉浸式摄像机控制器
 * 支持：自由拖拽 360° 环顾、滚轮焦距缩放、快捷视角丝滑过渡、电梯启停惯性顿挫与运行微震
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

  private dragging = false;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private lastX = 0;
  private lastY = 0;
  private dragDistance = 0;

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
    return this.dragDistance > 6;
  }

  public applyPreset(id: CameraPreset['id']): void {
    const preset = CAMERA_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    this.activePresetId = id;

    // Normalize yaw delta so camera rotates the shortest angular path
    const twoPi = Math.PI * 2;
    let delta = ((preset.yaw - this.currentYaw) % twoPi + twoPi * 1.5) % twoPi - Math.PI;
    this.targetYaw = this.currentYaw + delta;
    this.targetPitch = preset.pitch;
    this.targetFov = preset.fov;
    this.targetPos.set(...preset.position);
    this.onPresetChange?.(id);
  }

  public getActivePreset(): CameraPreset['id'] {
    return this.activePresetId;
  }

  private bindEvents(dom: HTMLElement): void {
    dom.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.pointerDownX = e.clientX;
      this.pointerDownY = e.clientY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.dragDistance = 0;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.dragDistance = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);

      if (this.dragDistance > 4) {
        const sensitivity = 0.0042 * (this.currentFov / 62);
        this.targetYaw -= dx * sensitivity;
        this.targetPitch = THREE.MathUtils.clamp(
          this.targetPitch - dy * sensitivity,
          -Math.PI * 0.44,
          Math.PI * 0.44
        );
        this.onPresetChange?.(null);
      }
    });

    window.addEventListener('pointerup', () => {
      this.dragging = false;
    });

    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.targetFov = THREE.MathUtils.clamp(this.targetFov + e.deltaY * 0.03, 32, 76);
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
    const smooth = 1 - Math.exp(-9.5 * clampedDt);

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
