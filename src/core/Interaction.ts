import * as THREE from 'three';
import { ButtonActionId } from '../types';
import { CameraRig } from './CameraRig';

export interface InteractionCallbacks {
  onHover: (id: ButtonActionId | null) => void;
  onClick: (id: ButtonActionId) => void;
  onDoubleClick: (id: ButtonActionId) => void;
}

/**
 * 3D 射线检测交互控制器
 * 精确区分拖拽环顾与物理按钮点击，支持悬停高亮、单击触发、双击取消
 */
export class Interaction {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2(-9, -9);

  private hoveredId: ButtonActionId | null = null;
  private lastClickId: ButtonActionId | null = null;
  private lastClickTime = 0;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly cameraRig: CameraRig,
    private readonly targets: THREE.Object3D[],
    private readonly callbacks: InteractionCallbacks
  ) {
    this.bindEvents();
  }

  private updateNdc(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickButton(): ButtonActionId | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.cameraRig.camera);
    const hits = this.raycaster.intersectObjects(this.targets, false);
    if (hits.length === 0) return null;
    const id = hits[0].object.userData.buttonId as ButtonActionId | undefined;
    return id ?? null;
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointermove', (e) => {
      this.updateNdc(e.clientX, e.clientY);
      const picked = this.pickButton();
      if (picked !== this.hoveredId) {
        this.hoveredId = picked;
        this.domElement.style.cursor = picked ? 'pointer' : 'grab';
        this.callbacks.onHover(picked);
      }
    });

    this.domElement.addEventListener('pointerdown', (e) => {
      if (e.button === 0 && !this.hoveredId) {
        this.domElement.style.cursor = 'grabbing';
      }
    });

    this.domElement.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      this.updateNdc(e.clientX, e.clientY);
      const picked = this.pickButton();
      this.domElement.style.cursor = picked ? 'pointer' : 'grab';

      if (this.cameraRig.isDraggingGesture || !picked) return;

      const now = performance.now();
      if (this.lastClickId === picked && now - this.lastClickTime < 340) {
        this.lastClickId = null;
        this.callbacks.onDoubleClick(picked);
      } else {
        this.lastClickId = picked;
        this.lastClickTime = now;
        this.callbacks.onClick(picked);
      }
    });
  }
}
