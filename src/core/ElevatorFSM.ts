import { ElevatorState, FLOOR_HEIGHT, FLOORS, INITIAL_FLOOR_INDEX, MoveDirection } from '../types';

export interface ElevatorEvents {
  onDoorOpening?: () => void;
  onDoorClosing?: () => void;
  onStartMoving?: (direction: MoveDirection) => void;
  onArrive?: (floorIndex: number, direction: MoveDirection) => void;
  onStateChange?: (state: ElevatorState) => void;
}

/**
 * 电梯有限状态机与运动学物理引擎
 * 实现 LOOK 顺路调度算法、真实加减速曲线、开门停留自动关门与即时打断逻辑
 */
export class ElevatorFSM {
  public state: ElevatorState = 'OPEN';
  public direction: MoveDirection = 0;

  /** 轿厢当前物理高度（米） */
  public elevation: number = INITIAL_FLOOR_INDEX * FLOOR_HEIGHT;
  /** 当前速度（m/s，带符号） */
  public velocity = 0;
  /** 当前加速度（m/s²，用于驱动摄像机启停顿挫） */
  public acceleration = 0;
  /** 当前最接近楼层索引 */
  public currentFloor: number = INITIAL_FLOOR_INDEX;
  /** 本次运行目标楼层 */
  public targetFloor: number | null = null;

  /** 门开启进度: 0 = 完全关闭, 1 = 完全打开 */
  public doorProgress = 1;

  /** 已点亮等待前往的楼层集合 */
  public readonly queuedFloors = new Set<number>();

  private doorHoldTimer = 0;
  private idleCloseDelay = 4.6; // seconds door stays open before auto-close
  private readonly doorSpeed = 0.85; // full open/close in ~1.18s
  private readonly maxSpeed = 6.2; // m/s high-speed 20-floor elevator
  private readonly maxAccel = 2.6; // m/s²

  private readonly events: ElevatorEvents;

  constructor(events: ElevatorEvents = {}) {
    this.events = events;
    this.doorHoldTimer = 0; // Initially stay open in lobby until user presses a button or closes door
  }

  public get maxSpeedValue(): number {
    return this.maxSpeed;
  }

  /**
   * 选择一个楼层
   * @returns 'queued' | 'already-here' | 'already-queued'
   */
  public requestFloor(floorIndex: number): 'queued' | 'already-here' | 'already-queued' {
    if (floorIndex < 0 || floorIndex >= FLOORS.length) return 'already-here';

    // Already stopped at this floor
    if (
      (this.state === 'IDLE' || this.state === 'OPEN' || this.state === 'OPENING') &&
      this.currentFloor === floorIndex
    ) {
      if (this.state === 'IDLE') {
        this.startOpening();
      } else {
        this.doorHoldTimer = this.idleCloseDelay;
      }
      return 'already-here';
    }

    // Re-open if closing at same floor
    if (this.state === 'CLOSING' && this.currentFloor === floorIndex && this.queuedFloors.size === 0) {
      this.startOpening();
      return 'already-here';
    }

    if (this.queuedFloors.has(floorIndex)) {
      return 'already-queued';
    }

    this.queuedFloors.add(floorIndex);

    // If waiting open with infinite lobby idle, trigger quick close countdown
    if (this.state === 'OPEN') {
      this.doorHoldTimer = Math.min(this.doorHoldTimer > 0 ? this.doorHoldTimer : 1.0, 1.0);
    } else if (this.state === 'IDLE') {
      this.pickNextTargetAndMove();
    } else if (this.state === 'MOVING') {
      // Check if newly added floor is strictly on the way and we have enough stopping distance
      this.reEvaluateTargetWhileMoving();
    }

    return 'queued';
  }

  /**
   * 取消已选楼层（双击/右键）
   */
  public cancelFloor(floorIndex: number): boolean {
    if (!this.queuedFloors.has(floorIndex)) return false;
    this.queuedFloors.delete(floorIndex);

    if (this.state === 'MOVING' && this.targetFloor === floorIndex) {
      const next = this.findNearestStopInDirection(this.direction);
      if (next !== null) {
        this.targetFloor = next;
      } else {
        // Safely stop at next reachable floor in current direction
        const stoppingDist = (this.velocity * this.velocity) / (2 * this.maxAccel);
        const stopElev = this.elevation + Math.sign(this.velocity) * stoppingDist;
        const safeFloor = Math.min(
          FLOORS.length - 1,
          Math.max(0, this.velocity >= 0 ? Math.ceil(stopElev / FLOOR_HEIGHT) : Math.floor(stopElev / FLOOR_HEIGHT))
        );
        this.targetFloor = safeFloor;
      }
    }
    return true;
  }

  /**
   * 按下“开门”键
   */
  public pressOpenDoor(): void {
    if (this.state === 'MOVING') return;
    if (this.state === 'OPEN') {
      this.doorHoldTimer = this.idleCloseDelay;
      return;
    }
    if (this.state === 'CLOSING' || this.state === 'IDLE') {
      this.startOpening();
    }
  }

  /**
   * 按下“关门”键
   */
  public pressCloseDoor(): void {
    if (this.state === 'OPEN' || this.state === 'OPENING') {
      this.startClosing();
    }
  }

  private setState(next: ElevatorState): void {
    if (this.state !== next) {
      this.state = next;
      this.events.onStateChange?.(next);
    }
  }

  private startOpening(): void {
    this.setState('OPENING');
    this.events.onDoorOpening?.();
  }

  private startClosing(): void {
    this.setState('CLOSING');
    this.events.onDoorClosing?.();
  }

  /**
   * LOOK 调度算法：优先沿当前方向找最近的请求，否则掉头
   */
  private pickNextTarget(): number | null {
    if (this.queuedFloors.size === 0) return null;

    const sorted = Array.from(this.queuedFloors).sort((a, b) => a - b);

    if (this.direction >= 0) {
      const above = sorted.find((f) => f > this.currentFloor);
      if (above !== undefined) return above;
      const below = [...sorted].reverse().find((f) => f < this.currentFloor);
      if (below !== undefined) return below;
    } else {
      const below = [...sorted].reverse().find((f) => f < this.currentFloor);
      if (below !== undefined) return below;
      const above = sorted.find((f) => f > this.currentFloor);
      if (above !== undefined) return above;
    }

    // Fallback: requested current floor
    if (this.queuedFloors.has(this.currentFloor)) {
      this.queuedFloors.delete(this.currentFloor);
      this.startOpening();
    }
    return null;
  }

  private findNearestStopInDirection(dir: MoveDirection): number | null {
    if (dir === 0 || this.queuedFloors.size === 0) return null;
    const stoppingDist = (this.velocity * this.velocity) / (2 * this.maxAccel) + 0.35;
    let best: number | null = null;
    let bestDist = Infinity;

    for (const f of this.queuedFloors) {
      const fElev = f * FLOOR_HEIGHT;
      const delta = fElev - this.elevation;
      if (dir > 0 && delta >= stoppingDist && delta < bestDist) {
        best = f;
        bestDist = delta;
      } else if (dir < 0 && delta <= -stoppingDist && -delta < bestDist) {
        best = f;
        bestDist = -delta;
      }
    }
    return best;
  }

  private reEvaluateTargetWhileMoving(): void {
    const nearer = this.findNearestStopInDirection(this.direction);
    if (nearer !== null) {
      this.targetFloor = nearer;
    }
  }

  private pickNextTargetAndMove(): void {
    const next = this.pickNextTarget();
    if (next === null) {
      this.direction = 0;
      this.targetFloor = null;
      this.setState('IDLE');
      return;
    }
    this.targetFloor = next;
    this.direction = next > this.currentFloor ? 1 : -1;
    this.setState('MOVING');
    this.events.onStartMoving?.(this.direction);
  }

  /**
   * 每帧推进状态机与物理运动
   */
  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.05);
    const prevVelocity = this.velocity;

    switch (this.state) {
      case 'IDLE': {
        this.velocity = 0;
        this.acceleration = 0;
        if (this.queuedFloors.size > 0) {
          this.pickNextTargetAndMove();
        }
        break;
      }

      case 'OPENING': {
        this.velocity = 0;
        this.acceleration = 0;
        this.doorProgress = Math.min(1, this.doorProgress + this.doorSpeed * clampedDt);
        if (this.doorProgress >= 1) {
          this.doorHoldTimer = this.queuedFloors.size > 0 ? 2.6 : this.idleCloseDelay;
          this.setState('OPEN');
        }
        break;
      }

      case 'OPEN': {
        this.velocity = 0;
        this.acceleration = 0;
        if (this.doorHoldTimer > 0) {
          this.doorHoldTimer -= clampedDt;
          if (this.doorHoldTimer <= 0) {
            // Auto close if there are queued floors, or after timeout for realism
            if (this.queuedFloors.size > 0) {
              this.startClosing();
            } else {
              this.doorHoldTimer = 0;
            }
          }
        }
        break;
      }

      case 'CLOSING': {
        this.velocity = 0;
        this.acceleration = 0;
        this.doorProgress = Math.max(0, this.doorProgress - this.doorSpeed * clampedDt);
        if (this.doorProgress <= 0) {
          if (this.queuedFloors.size > 0) {
            this.pickNextTargetAndMove();
          } else {
            this.direction = 0;
            this.setState('IDLE');
          }
        }
        break;
      }

      case 'MOVING': {
        if (this.targetFloor === null) {
          this.pickNextTargetAndMove();
          break;
        }

        const targetElev = this.targetFloor * FLOOR_HEIGHT;
        const diff = targetElev - this.elevation;
        const dist = Math.abs(diff);
        const dir = Math.sign(diff) as MoveDirection;
        this.direction = dir;

        if (dist < 0.015 && Math.abs(this.velocity) < 0.12) {
          // Arrived cleanly
          this.elevation = targetElev;
          this.velocity = 0;
          this.acceleration = 0;
          this.currentFloor = this.targetFloor;
          this.queuedFloors.delete(this.targetFloor);
          const arrivedDir = dir;
          this.targetFloor = null;

          // Decide upcoming direction hint for chime & arrow
          if (this.queuedFloors.size === 0) {
            this.direction = 0;
          } else {
            const hasMoreInSameDir = Array.from(this.queuedFloors).some((f) =>
              arrivedDir > 0 ? f > this.currentFloor : f < this.currentFloor
            );
            if (!hasMoreInSameDir) {
              this.direction = (arrivedDir * -1) as MoveDirection;
            }
          }

          this.events.onArrive?.(this.currentFloor, arrivedDir);
          this.startOpening();
          break;
        }

        // Smooth deceleration target speed: v = sqrt(2 * a * d)
        const brakingSpeed = Math.sqrt(2 * this.maxAccel * dist);
        const desiredSpeed = Math.min(this.maxSpeed, brakingSpeed) * dir;
        const maxDeltaV = this.maxAccel * clampedDt;
        const dv = desiredSpeed - this.velocity;
        if (Math.abs(dv) <= maxDeltaV) {
          this.velocity = desiredSpeed;
        } else {
          this.velocity += Math.sign(dv) * maxDeltaV;
        }

        this.elevation += this.velocity * clampedDt;
        this.currentFloor = Math.min(
          FLOORS.length - 1,
          Math.max(0, Math.round(this.elevation / FLOOR_HEIGHT))
        );
        this.acceleration = (this.velocity - prevVelocity) / Math.max(clampedDt, 0.001);
        break;
      }
    }
  }
}
