import * as THREE from 'three';

export interface FloorImageBackdropConfig {
  /** 图片路径，例如 '/panoramas/floor-02-1f.jpg' */
  url: string;
  /**
   * 'panorama': 360° 等距柱状全景图 (2:1)，投影到全景球体
   * 'wide':     16:9 / 21:9 写实广角照片，投影到门外无缝曲面巨幕（硅基流动默认生成模式）
   */
  mode: 'panorama' | 'wide';
  /** 亮度微调系数（默认 0.96，避免 Bloom 过曝） */
  brightness?: number;
  /** 水平旋转偏移（弧度） */
  rotationY?: number;
}

interface ManifestResponse {
  floors?: Record<string, FloorImageBackdropConfig>;
}

/**
 * 可选手动覆盖配置（优先级高于 manifest.json）
 */
export const MANUAL_FLOOR_BACKDROPS: Partial<Record<number, FloorImageBackdropConfig>> = {};

/**
 * 纯静态图片驱动的门外实景管理器
 * 启动时自动读取 public/panoramas/manifest.json，按楼层懒加载高清实景图，
 * 加载完成后自动切换显示曲面摄影幕墙 + 门外无缝过渡地板，并隐藏对应低模 3D 场景。
 */
export class FloorBackdropManager {
  private readonly loader = new THREE.TextureLoader();
  private readonly configs = new Map<number, FloorImageBackdropConfig>();
  private readonly requestedFloors = new Set<number>();
  private manifestLoaded = false;

  constructor() {
    Object.entries(MANUAL_FLOOR_BACKDROPS).forEach(([k, v]) => {
      if (v) this.configs.set(Number(k), v);
    });
    void this.fetchManifest();
  }

  private async fetchManifest(): Promise<void> {
    try {
      const res = await fetch(`/panoramas/manifest.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = (await res.json()) as ManifestResponse;
      if (data?.floors) {
        Object.entries(data.floors).forEach(([k, v]) => {
          const idx = Number(k);
          if (!this.configs.has(idx) && v?.url) {
            this.configs.set(idx, v);
          }
        });
      }
    } catch {
      // Ignore if manifest does not exist yet
    } finally {
      this.manifestLoaded = true;
    }
  }

  public isReady(): boolean {
    return this.manifestLoaded || this.configs.size > 0;
  }

  /**
   * 当电梯靠近某层时按需加载该层实景照片；加载成功后自动切换到实景幕墙
   */
  public ensureLoaded(
    floorIndex: number,
    photoGroup: THREE.Group,
    proceduralGroup: THREE.Group,
    landingFloorMaterial: THREE.Material
  ): void {
    if (this.requestedFloors.has(floorIndex)) return;
    const cfg = this.configs.get(floorIndex);
    if (!cfg) return;

    this.requestedFloors.add(floorIndex);

    this.loader.load(
      cfg.url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 4;

        const brightness = cfg.brightness ?? 0.96;
        const color = new THREE.Color(brightness, brightness, brightness);

        if (cfg.mode === 'panorama') {
          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(7.0, 48, 32),
            new THREE.MeshBasicMaterial({
              map: texture,
              color,
              side: THREE.BackSide,
              fog: false,
              toneMapped: false,
            })
          );
          dome.position.set(0, 1.48, -1.6);
          dome.rotation.y = cfg.rotationY ?? Math.PI * 0.5;
          photoGroup.add(dome);
        } else {
          // Exact 1664:928 (1.793) curved cinema backdrop aligned to eye-level horizon (~1.54m)
          const radius = 3.55;
          const arcAngle = Math.PI * 0.7;
          const height = (radius * arcAngle) / (1664 / 928); // ~4.35m
          const cylGeo = new THREE.CylinderGeometry(
            radius,
            radius,
            height,
            48,
            1,
            true,
            Math.PI - arcAngle / 2,
            arcAngle
          );

          // Flip UVs horizontally for interior-facing cylinder
          const uv = cylGeo.attributes.uv;
          for (let i = 0; i < uv.count; i++) {
            uv.setX(i, 1 - uv.getX(i));
          }

          const backdrop = new THREE.Mesh(
            cylGeo,
            new THREE.MeshBasicMaterial({
              map: texture,
              color,
              side: THREE.BackSide,
              fog: false,
              toneMapped: false,
            })
          );
          backdrop.position.set(0, 1.54, -1.05);
          backdrop.rotation.y = cfg.rotationY ?? 0;
          photoGroup.add(backdrop);

          // Seamless 3D landing floor apron right outside the threshold so looking down never exposes empty void
          const landingFloor = new THREE.Mesh(
            new THREE.CircleGeometry(radius + 0.08, 40, 0, Math.PI),
            landingFloorMaterial
          );
          landingFloor.rotation.x = -Math.PI / 2;
          landingFloor.position.set(0, -0.012, -1.05);
          photoGroup.add(landingFloor);

          // Subtle dark ceiling cap high above lintel extending into -Z so upward glances never expose gaps
          const ceilingCap = new THREE.Mesh(
            new THREE.CircleGeometry(radius + 0.08, 32, Math.PI, Math.PI),
            new THREE.MeshBasicMaterial({ color: 0x0b0f18 })
          );
          ceilingCap.rotation.x = Math.PI / 2;
          ceilingCap.position.set(0, 1.54 + height / 2 - 0.02, -1.05);
          photoGroup.add(ceilingCap);
        }

        // Smoothly switch from procedural low-poly lobby to photographic backdrop
        photoGroup.visible = true;
        proceduralGroup.visible = false;
      },
      undefined,
      () => {
        // Keep procedural fallback visible on image load error
      }
    );
  }
}
