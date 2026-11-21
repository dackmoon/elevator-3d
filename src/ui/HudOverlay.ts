import { CAMERA_PRESETS } from '../core/CameraRig';
import { CameraPreset, ElevatorState, FLOORS, MoveDirection } from '../types';

export interface HudCallbacks {
  onSelectPreset: (id: CameraPreset['id']) => void;
  onToggleMute: () => boolean;
  onToggleRain: () => boolean;
}

/**
 * 极简克制的玻璃态 HUD 叠加层
 * 提供状态胶囊、按钮悬停提示、快捷视角切换、雨夜切换与静音开关
 */
export class HudOverlay {
  private readonly root: HTMLDivElement;
  private readonly floorBadge: HTMLElement;
  private readonly floorName: HTMLElement;
  private readonly stateLabel: HTMLElement;
  private readonly queueLabel: HTMLElement;
  private readonly tooltipEl: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly rainBtn: HTMLButtonElement;
  private readonly presetBtns = new Map<CameraPreset['id'], HTMLButtonElement>();

  private toastTimer: number | null = null;

  constructor(container: HTMLElement, callbacks: HudCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'hud-root';
    this.root.innerHTML = `
      <div class="hud-top-left">
        <div class="hud-floor-badge" id="hud-floor">1F</div>
        <div class="hud-meta">
          <div class="hud-floor-name" id="hud-name">现代大堂</div>
          <div class="hud-sub-row">
            <span class="hud-state" id="hud-state">门已开启</span>
            <span class="hud-queue" id="hud-queue"></span>
          </div>
        </div>
      </div>

      <div class="hud-top-right">
        <button class="hud-icon-btn" id="hud-rain" title="切换雨夜 / 晴夜观光氛围">🌧 雨夜</button>
        <button class="hud-icon-btn" id="hud-mute" title="静音 / 开启音效 (M)">🔊 音效</button>
      </div>

      <div class="hud-tooltip hidden" id="hud-tooltip"></div>
      <div class="hud-toast hidden" id="hud-toast"></div>

      <div class="hud-bottom-bar">
        <div class="hud-presets" id="hud-presets"></div>
        <div class="hud-hint">左键点击按钮 · 拖拽环顾四周 · 滚轮缩放 · 快捷键 1~9 / 0 / - / = / O / C / R</div>
      </div>
    `;
    container.appendChild(this.root);

    this.floorBadge = this.root.querySelector('#hud-floor')!;
    this.floorName = this.root.querySelector('#hud-name')!;
    this.stateLabel = this.root.querySelector('#hud-state')!;
    this.queueLabel = this.root.querySelector('#hud-queue')!;
    this.tooltipEl = this.root.querySelector('#hud-tooltip')!;
    this.toastEl = this.root.querySelector('#hud-toast')!;
    this.muteBtn = this.root.querySelector('#hud-mute')!;
    this.rainBtn = this.root.querySelector('#hud-rain')!;

    const presetsWrap = this.root.querySelector('#hud-presets')!;
    CAMERA_PRESETS.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = 'hud-preset-btn' + (p.id === 'default' ? ' active' : '');
      btn.textContent = p.label;
      btn.addEventListener('click', () => callbacks.onSelectPreset(p.id));
      presetsWrap.appendChild(btn);
      this.presetBtns.set(p.id, btn);
    });

    this.muteBtn.addEventListener('click', () => {
      const muted = callbacks.onToggleMute();
      this.setMuteVisual(muted);
    });

    this.rainBtn.addEventListener('click', () => {
      const rainOn = callbacks.onToggleRain();
      this.rainBtn.textContent = rainOn ? '🌧 雨夜' : '🌙 晴夜';
    });
  }

  public setMuteVisual(muted: boolean): void {
    this.muteBtn.textContent = muted ? '🔇 已静音' : '🔊 音效';
    this.muteBtn.classList.toggle('muted', muted);
  }

  public setActivePreset(id: CameraPreset['id'] | null): void {
    this.presetBtns.forEach((btn, key) => {
      btn.classList.toggle('active', key === id);
    });
  }

  public setTooltip(text: string | null): void {
    if (!text) {
      this.tooltipEl.classList.add('hidden');
      return;
    }
    this.tooltipEl.textContent = text;
    this.tooltipEl.classList.remove('hidden');
  }

  public showToast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 2200);
  }

  public updateStatus(
    floorIndex: number,
    direction: MoveDirection,
    state: ElevatorState,
    queuedFloors: Set<number>
  ): void {
    const floor = FLOORS[floorIndex] ?? FLOORS[2];
    const arrow = direction > 0 ? '▲ ' : direction < 0 ? '▼ ' : '';
    this.floorBadge.textContent = `${arrow}${floor.displayLabel}`;
    this.floorName.textContent = floor.nameZh;

    const stateTextMap: Record<ElevatorState, string> = {
      IDLE: '待机中',
      OPENING: '正在开门...',
      OPEN: '门已开启',
      CLOSING: '正在关门...',
      MOVING: direction > 0 ? '上行中...' : '下行中...',
    };
    this.stateLabel.textContent = stateTextMap[state];

    if (queuedFloors.size > 0) {
      const labels = Array.from(queuedFloors)
        .sort((a, b) => a - b)
        .map((idx) => FLOORS[idx].displayLabel)
        .join(' · ');
      this.queueLabel.textContent = `目标: ${labels}`;
    } else {
      this.queueLabel.textContent = '';
    }
  }
}
