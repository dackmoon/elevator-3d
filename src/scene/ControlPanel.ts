import * as THREE from 'three';
import { ButtonActionId, FLOORS } from '../types';
import { createBrushedMetalTexture, createButtonCapTexture, createPlateTexture } from '../utils/textures';
import { FloorDisplay } from './FloorDisplay';

export interface InteractiveButton {
  id: ButtonActionId;
  tooltip: string;
  hitMesh: THREE.Mesh;
  movingGroup: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  activeColor: THREE.Color;
  idleColor: THREE.Color;
  baseZ: number;
  pressDepth: number; // 0..1 animation state
  isLit: boolean;
  isHovered: boolean;
}

/**
 * 20 层高速电梯主控物理按钮面板（COP）
 * 4 列 × 5 行共 20 个楼层物理按键 + 开关门/警铃/照明/风扇功能键
 */
export class ControlPanel {
  public readonly group = new THREE.Group();
  public readonly buttons = new Map<ButtonActionId, InteractiveButton>();
  public readonly hitMeshes: THREE.Object3D[] = [];

  constructor(sharedDisplay: FloorDisplay) {
    this.buildPanelFrame(sharedDisplay);
    this.buildFloorButtons();
    this.buildFunctionButtons();
    this.buildSpeakerGrille();
  }

  private buildPanelFrame(sharedDisplay: FloorDisplay): void {
    const panelTex = createBrushedMetalTexture('#1f242c', 22, false);
    const frameTex = createBrushedMetalTexture('#c4cbd4', 16, false);

    // Outer metallic trim bezel (widened to 0.40m to comfortably host 4×5 buttons)
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 1.28, 0.022),
      new THREE.MeshStandardMaterial({
        map: frameTex,
        metalness: 0.62,
        roughness: 0.44,
        envMapIntensity: 0.45,
      })
    );
    bezel.position.set(0, 0, 0.004);
    this.group.add(bezel);

    // Inner dark titanium brushed face
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(0.374, 1.254, 0.016),
      new THREE.MeshStandardMaterial({
        map: panelTex,
        metalness: 0.52,
        roughness: 0.48,
        envMapIntensity: 0.4,
      })
    );
    face.position.set(0, 0, 0.012);
    this.group.add(face);

    // Sub LED screen near top of panel
    const screenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.095, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x090b10, metalness: 0.6, roughness: 0.2 })
    );
    screenFrame.position.set(0, 0.535, 0.02);
    this.group.add(screenFrame);

    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.304, 0.08),
      new THREE.MeshBasicMaterial({ map: sharedDisplay.texture })
    );
    screenMesh.position.set(0, 0.535, 0.026);
    this.group.add(screenMesh);

    // Manufacturer metallic nameplate
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.30, 0.064),
      new THREE.MeshStandardMaterial({
        map: createPlateTexture(),
        metalness: 0.55,
        roughness: 0.35,
      })
    );
    plateMesh.position.set(0, 0.435, 0.022);
    this.group.add(plateMesh);

    // Horizontal divider lines
    const divMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.8, roughness: 0.25 });
    const div1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.003, 0.004), divMat);
    div1.position.set(0, 0.382, 0.021);
    this.group.add(div1);

    const div2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.003, 0.004), divMat);
    div2.position.set(0, -0.155, 0.021);
    this.group.add(div2);
  }

  private buildFloorButtons(): void {
    // Arrange 20 floors from bottom to top in 4 columns × 5 rows:
    // Row 0 (bottom): B2, B1,  1,  2
    // Row 1:           3,  4,  5,  6
    // Row 2:           7,  8,  9, 10
    // Row 3:          11, 12, 13, 14
    // Row 4 (top):    15, 16, 17, 18
    const cols = 4;
    const colGap = 0.082;
    const rowGap = 0.096;
    const startY = -0.095;

    FLOORS.forEach((floor, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = (col - (cols - 1) / 2) * colGap;
      const y = startY + row * rowGap;

      this.createPhysicalButton({
        id: `floor:${floor.index}`,
        label: floor.code,
        tooltip: `${floor.displayLabel} · ${floor.nameZh}（单击选层 / 双击取消）`,
        x,
        y,
        radius: 0.0285,
        fontSize: floor.code.length >= 2 ? 92 : 114,
        activeHex: 0xffa630,
      });
    });
  }

  private buildFunctionButtons(): void {
    // Row 1: Door Open / Door Close
    this.createPhysicalButton({
      id: 'door:open',
      label: '◄►',
      subText: 'OPEN',
      tooltip: '开门（延长停留或重新打开电梯门）',
      x: -0.082,
      y: -0.238,
      radius: 0.034,
      fontSize: 78,
      activeHex: 0x38bdf8,
    });

    this.createPhysicalButton({
      id: 'door:close',
      label: '►◄',
      subText: 'CLOSE',
      tooltip: '关门（立即提前关闭电梯门）',
      x: 0.082,
      y: -0.238,
      radius: 0.034,
      fontSize: 78,
      activeHex: 0x38bdf8,
    });

    // Row 2: Alarm / Light Emergency / Ventilation Fan
    this.createPhysicalButton({
      id: 'sys:alarm',
      label: '🔔',
      subText: 'ALARM',
      tooltip: '紧急警铃（开关红色警示灯与警铃）',
      x: -0.105,
      y: -0.362,
      radius: 0.029,
      fontSize: 76,
      activeHex: 0xff3b30,
    });

    this.createPhysicalButton({
      id: 'sys:light',
      label: '☀',
      subText: 'LIGHT',
      tooltip: '照明 / 应急灯模式切换',
      x: 0,
      y: -0.362,
      radius: 0.029,
      fontSize: 84,
      activeHex: 0xfacc15,
    });

    this.createPhysicalButton({
      id: 'sys:fan',
      label: '✳',
      subText: 'FAN',
      tooltip: '顶部换气扇开关',
      x: 0.105,
      y: -0.362,
      radius: 0.029,
      fontSize: 86,
      activeHex: 0x34d399,
    });
  }

  private createPhysicalButton(cfg: {
    id: ButtonActionId;
    label: string;
    subText?: string;
    tooltip: string;
    x: number;
    y: number;
    radius: number;
    fontSize?: number;
    activeHex: number;
  }): void {
    const holder = new THREE.Group();
    holder.position.set(cfg.x, cfg.y, 0.021);
    this.group.add(holder);

    // Outer recessed metallic socket
    const socket = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.radius * 1.15, cfg.radius * 1.2, 0.008, 28),
      new THREE.MeshStandardMaterial({
        color: 0x8f98a6,
        metalness: 0.65,
        roughness: 0.42,
        envMapIntensity: 0.45,
      })
    );
    socket.rotation.x = Math.PI / 2;
    socket.position.z = 0.002;
    holder.add(socket);

    // Moving plunger group (physically depresses into socket on click)
    const movingGroup = new THREE.Group();
    const baseZ = 0.006;
    movingGroup.position.z = baseZ;
    holder.add(movingGroup);

    // LED light halo ring
    const idleColor = new THREE.Color(0x3a414d);
    const activeColor = new THREE.Color(cfg.activeHex);
    const ringMat = new THREE.MeshStandardMaterial({
      color: idleColor.clone(),
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.1,
    });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius * 0.97, cfg.radius * 0.115, 12, 32),
      ringMat
    );
    ring.position.z = 0.004;
    movingGroup.add(ring);

    // Button metallic cylinder body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.radius * 0.9, cfg.radius * 0.94, 0.012, 28),
      new THREE.MeshStandardMaterial({
        color: 0x2a303a,
        metalness: 0.78,
        roughness: 0.28,
      })
    );
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.002;
    movingGroup.add(body);

    // Printed button face cap
    const capTex = createButtonCapTexture(cfg.label, {
      fontSize: cfg.fontSize,
      subText: cfg.subText,
    });
    const cap = new THREE.Mesh(
      new THREE.CircleGeometry(cfg.radius * 0.88, 28),
      new THREE.MeshStandardMaterial({
        map: capTex,
        metalness: 0.2,
        roughness: 0.55,
        envMapIntensity: 0.35,
      })
    );
    cap.position.z = 0.0086;
    movingGroup.add(cap);

    // Generous invisible hit cylinder for accurate clicking
    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.radius * 1.24, cfg.radius * 1.24, 0.028, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.rotation.x = Math.PI / 2;
    hitMesh.position.z = 0.008;
    hitMesh.userData.buttonId = cfg.id;
    holder.add(hitMesh);

    this.hitMeshes.push(hitMesh);
    this.buttons.set(cfg.id, {
      id: cfg.id,
      tooltip: cfg.tooltip,
      hitMesh,
      movingGroup,
      ringMat,
      activeColor,
      idleColor,
      baseZ,
      pressDepth: 0,
      isLit: false,
      isHovered: false,
    });
  }

  private buildSpeakerGrille(): void {
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x090b0f });
    const holeGeo = new THREE.CircleGeometry(0.0045, 10);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 11; c++) {
        const dot = new THREE.Mesh(holeGeo, holeMat);
        dot.position.set((c - 5) * 0.022, -0.49 - r * 0.022, 0.0215);
        this.group.add(dot);
      }
    }
  }

  public triggerPressAnimation(id: ButtonActionId): void {
    const btn = this.buttons.get(id);
    if (btn) {
      btn.pressDepth = 1;
    }
  }

  public setButtonLit(id: ButtonActionId, lit: boolean): void {
    const btn = this.buttons.get(id);
    if (btn) {
      btn.isLit = lit;
    }
  }

  public setHovered(id: ButtonActionId | null): void {
    this.buttons.forEach((btn, key) => {
      btn.isHovered = key === id;
    });
  }

  public getTooltip(id: ButtonActionId | null): string | null {
    if (!id) return null;
    return this.buttons.get(id)?.tooltip ?? null;
  }

  public update(dt: number, elapsed: number): void {
    const clampedDt = Math.min(dt, 0.05);

    this.buttons.forEach((btn) => {
      // Smooth elastic spring rebound for button plunger
      if (btn.pressDepth > 0) {
        btn.pressDepth = Math.max(0, btn.pressDepth - clampedDt * 6.8);
      }
      const easePress = Math.sin(btn.pressDepth * Math.PI * 0.5);
      btn.movingGroup.position.z = btn.baseZ - easePress * 0.0068;

      // LED ring emissive state
      if (btn.isLit) {
        const pulse = btn.id === 'sys:alarm' ? 0.65 + 0.55 * Math.sin(elapsed * 12) : 1.0;
        btn.ringMat.color.copy(btn.activeColor);
        btn.ringMat.emissive.copy(btn.activeColor);
        btn.ringMat.emissiveIntensity = (btn.isHovered ? 2.4 : 1.85) * pulse;
      } else if (btn.isHovered) {
        btn.ringMat.color.lerpColors(btn.idleColor, btn.activeColor, 0.45);
        btn.ringMat.emissive.copy(btn.activeColor);
        btn.ringMat.emissiveIntensity = 0.55;
      } else {
        btn.ringMat.color.copy(btn.idleColor);
        btn.ringMat.emissive.setHex(0x000000);
        btn.ringMat.emissiveIntensity = 0;
      }
    });
  }
}
