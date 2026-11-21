import * as THREE from 'three';
import { FLOOR_HEIGHT, FLOORS } from '../types';
import {
  createConcretePBRTextures,
  createHazardStripeTexture,
  createLightMarbleTexture,
  createShaftFloorSignTexture,
  createSkyscraperFacadeTexture,
  createSoftCloudTexture,
  createWoodPlankTexture,
} from '../utils/textures';
import { FloorBackdropManager } from './FloorBackdropManager';

interface FloorLightEntry {
  floorIndex: number;
  light: THREE.PointLight;
  baseIntensity: number;
  flicker?: boolean;
}

interface FloorLobbyEntry {
  floorIndex: number;
  rootGroup: THREE.Group;
  proceduralGroup: THREE.Group;
  photoGroup: THREE.Group;
  floorMat: THREE.MeshStandardMaterial;
}

type FloorSurfaceType = 'concrete' | 'marble' | 'wood' | 'default';

/**
 * 20 层高速观光电梯外部世界（写实光影增强版）：
 * 1. 后窗全景观光井道 + 真实夜间摩天楼玻璃幕墙群 + 流动高架车河光带 + 漂浮高空薄云 + 航空闪烁灯 + 繁星
 * 2. 前门外 20 个带 PBR 纹理与环境反射的差异化主题候梯厅
 * 3. 内置 FloorBackdropManager，支持第二步直接用静态 AI 图片秒换照片级门外实景
 */
export class FloorWorlds {
  public readonly worldGroup = new THREE.Group();
  public readonly skyGroup = new THREE.Group();

  private readonly floorLights: FloorLightEntry[] = [];
  private readonly lobbies: FloorLobbyEntry[] = [];
  private readonly animatedObjects: Array<(elapsed: number, dt: number) => void> = [];
  private readonly backdropManager = new FloorBackdropManager();

  // Shared high-detail PBR procedural textures
  private readonly concretePBR = createConcretePBRTextures();
  private readonly lightMarbleTex = createLightMarbleTexture();
  private readonly woodPlankTex = createWoodPlankTexture();

  constructor() {
    this.buildShaftStructure();
    this.buildDistantCityAndStars();
    this.buildAllFloorLobbies();
  }

  /**
   * 贯通 20 层的垂直观光玻璃井道结构
   */
  private buildShaftStructure(): void {
    const totalHeight = (FLOORS.length + 1) * FLOOR_HEIGHT;
    const baseY = -FLOOR_HEIGHT * 0.5;

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x262f3d,
      metalness: 0.78,
      roughness: 0.36,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.2,
    });

    // Vertical main guide columns behind panoramic window
    [-1.45, 1.45].forEach((x) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.16, totalHeight, 0.16), steelMat);
      col.position.set(x, baseY + totalHeight / 2, 1.65);
      this.worldGroup.add(col);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, totalHeight, 0.08), railMat);
      rail.position.set(x * 0.85, baseY + totalHeight / 2, 1.38);
      this.worldGroup.add(rail);
    });

    // Hoist cables
    [-0.95, -0.88, 0.88, 0.95].forEach((x) => {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, totalHeight, 6),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 })
      );
      cable.position.set(x, baseY + totalHeight / 2, 1.45);
      this.worldGroup.add(cable);
    });

    // Per-floor crossbeams, luminous accent strips & giant glowing shaft floor signs
    FLOORS.forEach((floor) => {
      const y = floor.index * FLOOR_HEIGHT;

      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.18), steelMat);
      beam.position.set(0, y + 0.05, 1.72);
      this.worldGroup.add(beam);

      const accentStrip = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.045, 0.045),
        new THREE.MeshBasicMaterial({ color: floor.accentColor })
      );
      accentStrip.position.set(0, y + 0.17, 1.66);
      this.worldGroup.add(accentStrip);

      const signTex = createShaftFloorSignTexture(floor.displayLabel, floor.accentColor);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.86),
        new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
      );
      sign.position.set(0, y + 1.55, 2.35);
      sign.rotation.y = Math.PI;
      this.worldGroup.add(sign);

      // Underground concrete shaft wall for B2 & B1
      if (floor.index <= 1) {
        const concreteWall = new THREE.Mesh(
          new THREE.PlaneGeometry(4.2, FLOOR_HEIGHT),
          new THREE.MeshStandardMaterial({ color: 0x1e222a, roughness: 0.95 })
        );
        concreteWall.position.set(0, y + FLOOR_HEIGHT / 2, 2.42);
        concreteWall.rotation.y = Math.PI;
        this.worldGroup.add(concreteWall);
      }
    });
  }

  /**
   * 高层观光远景：真实夜间灯火玻璃幕墙摩天楼群、流动高架车河光带、高空漂浮夜雾、航空红灯与星海
   */
  private buildDistantCityAndStars(): void {
    // 4 varied nocturnal skyscraper curtain-wall textures
    const facadeMats = [0, 1, 2, 3].map((seed) => {
      const tex = createSkyscraperFacadeTexture(seed);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.72,
        roughness: 0.25,
        metalness: 0.65,
      });
    });
    const darkRoofMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.7 });
    const aviationLights: THREE.Mesh[] = [];

    for (let i = 0; i < 48; i++) {
      const w = 1.9 + Math.random() * 2.9;
      const h = 16 + Math.random() * 46;
      const d = 1.9 + Math.random() * 2.5;
      const x = (i - 24) * 2.0 + (Math.random() - 0.5) * 1.1;
      const z = 14 + Math.random() * 24;

      const sideMat = facadeMats[i % facadeMats.length];
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
        sideMat,
        sideMat,
        darkRoofMat,
        darkRoofMat,
        sideMat,
        sideMat,
      ]);
      bMesh.position.set(x, h / 2 - 7, z);
      this.skyGroup.add(bMesh);

      // Luminous crown accent line on select landmark skyscrapers
      if (i % 5 === 0) {
        const crownColor = i % 10 === 0 ? 0x38bdf8 : 0xfbbf24;
        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.08, 0.16, d + 0.08),
          new THREE.MeshBasicMaterial({ color: crownColor })
        );
        crown.position.set(x, h - 7.1, z);
        this.skyGroup.add(crown);
      }

      // Red aviation warning beacon atop tallest skyscrapers
      if (h > 36) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff2a2a })
        );
        beacon.position.set(x, h - 6.6, z);
        beacon.userData.phase = Math.random() * Math.PI * 2;
        this.skyGroup.add(beacon);
        aviationLights.push(beacon);
      }
    }

    // Elevated urban expressway with flowing red/white traffic light streams!
    const highwayZ = 12.2;
    const highwayY = 1.2;
    const roadDeck = new THREE.Mesh(
      new THREE.BoxGeometry(84, 0.25, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0d1320, roughness: 0.7 })
    );
    roadDeck.position.set(0, highwayY, highwayZ);
    this.skyGroup.add(roadDeck);

    const cars: Array<{ mesh: THREE.Mesh; speed: number; minX: number; maxX: number }> = [];
    const whiteHeadlightMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6 });
    const redTaillightMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    for (let i = 0; i < 36; i++) {
      const goingRight = i % 2 === 0;
      const streak = new THREE.Mesh(
        new THREE.BoxGeometry(0.85 + Math.random() * 0.7, 0.11, 0.16),
        goingRight ? whiteHeadlightMat : redTaillightMat
      );
      streak.position.set(
        (Math.random() - 0.5) * 76,
        highwayY + 0.24,
        highwayZ + (goingRight ? -0.42 : 0.42)
      );
      this.skyGroup.add(streak);
      cars.push({
        mesh: streak,
        speed: (goingRight ? 1 : -1) * (5.5 + Math.random() * 6.5),
        minX: -40,
        maxX: 40,
      });
    }

    // Drifting nocturnal low-altitude cloud / mist wisps around mid-high stories
    const cloudTex = createSoftCloudTexture();
    const clouds: Array<{ mesh: THREE.Mesh; speed: number }> = [];
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Mesh(
        new THREE.PlaneGeometry(14 + Math.random() * 10, 4.5 + Math.random() * 3),
        new THREE.MeshBasicMaterial({
          map: cloudTex,
          transparent: true,
          opacity: 0.26,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      cloud.position.set(
        (Math.random() - 0.5) * 56,
        14 + Math.random() * 26,
        11 + Math.random() * 14
      );
      cloud.rotation.y = Math.PI;
      this.skyGroup.add(cloud);
      clouds.push({ mesh: cloud, speed: 0.35 + Math.random() * 0.55 });
    }

    this.animatedObjects.push((elapsed, dt) => {
      aviationLights.forEach((b) => {
        b.visible = Math.sin(elapsed * 3.2 + (b.userData.phase as number)) > 0.1;
      });
      cars.forEach((c) => {
        c.mesh.position.x += c.speed * dt;
        if (c.mesh.position.x > c.maxX) c.mesh.position.x = c.minX;
        if (c.mesh.position.x < c.minX) c.mesh.position.x = c.maxX;
      });
      clouds.forEach((cl) => {
        cl.mesh.position.x += cl.speed * dt;
        if (cl.mesh.position.x > 34) cl.mesh.position.x = -34;
      });
    });

    // Dense night sky starfield
    const starCount = 650;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.55;
      const r = 46 + Math.random() * 14;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi) + 12;
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.24, transparent: true, opacity: 0.92 })
    );
    this.skyGroup.add(stars);
  }

  /**
   * 全部 20 个不同楼层的门外主题世界
   */
  private buildAllFloorLobbies(): void {
    this.buildB2Parking(0); // B2 地下车库
    this.buildB1Utility(1); // B1 设备机房
    this.build1FLobby(2); // 1F 现代大堂
    this.buildCafeOrBar(3, 'cafe'); // 2F 午夜咖啡吧
    this.buildFitnessClub(4); // 3F 健身俱乐部
    this.buildOfficeTheme(5, 0x38bdf8, 0xe2e8f0); // 4F 共享办公区
    this.buildLibrary(6); // 5F 静谧图书馆
    this.buildDesignStudio(7); // 6F 创意工作室
    this.buildTechLab(8); // 7F 科技研发层
    this.buildCafeOrBar(9, 'bistro'); // 8F 空中餐厅
    this.buildOfficeTheme(10, 0x60a5fa, 0xcbd5e1); // 9F 深夜写字楼
    this.buildSkyBridge(11); // 10F 空中连廊
    this.buildTradingFloor(12); // 11F 金融交易层
    this.buildNeonGallery(13); // 12F 霓虹画廊
    this.buildZenSanctuary(14); // 13F 禅意水景厅
    this.buildCinemaLounge(15); // 14F 私享放映厅
    this.buildSkyGarden(16); // 15F 空中温室
    this.buildCafeOrBar(17, 'cloudbar'); // 16F 云端酒吧
    this.buildExecutiveClub(18); // 17F 行政会所
    this.buildRooftop(19); // 18F 星空天台
  }

  private createLobbyShell(
    floorIndex: number,
    options: {
      floorColor: number;
      wallColor: number;
      ceilingColor?: number;
      openRoof?: boolean;
      openBack?: boolean;
      width?: number;
      depth?: number;
      height?: number;
      floorRoughness?: number;
      surfaceType?: FloorSurfaceType;
    }
  ): THREE.Group {
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, floorIndex * FLOOR_HEIGHT, 0);
    this.worldGroup.add(rootGroup);

    const proceduralGroup = new THREE.Group();
    const photoGroup = new THREE.Group();
    photoGroup.visible = false;
    rootGroup.add(proceduralGroup, photoGroup);

    const g = proceduralGroup;

    const w = options.width ?? 6.2;
    const d = options.depth ?? 5.6;
    const h = options.height ?? 3.1;
    const centerZ = -1.12 - d / 2;

    // Pick realistic PBR surface texture automatically based on floor theme
    const surface: FloorSurfaceType =
      options.surfaceType ??
      (floorIndex <= 1
        ? 'concrete'
        : floorIndex === 2 || floorIndex === 7 || floorIndex === 11
          ? 'marble'
          : floorIndex === 3 || floorIndex === 6 || floorIndex === 9 || floorIndex === 18
            ? 'wood'
            : 'default');

    let floorMat: THREE.MeshStandardMaterial;
    if (surface === 'concrete') {
      floorMat = new THREE.MeshStandardMaterial({
        map: this.concretePBR.map,
        bumpMap: this.concretePBR.bumpMap,
        bumpScale: 0.025,
        roughness: 0.84,
        metalness: 0.08,
      });
    } else if (surface === 'marble') {
      floorMat = new THREE.MeshStandardMaterial({
        map: this.lightMarbleTex,
        color: options.floorColor,
        roughness: 0.22,
        metalness: 0.12,
      });
    } else if (surface === 'wood') {
      floorMat = new THREE.MeshStandardMaterial({
        map: this.woodPlankTex,
        color: 0xd8c8ba,
        roughness: 0.45,
        metalness: 0.06,
      });
    } else {
      floorMat = new THREE.MeshStandardMaterial({
        color: options.floorColor,
        roughness: options.floorRoughness ?? 0.55,
        metalness: 0.12,
      });
    }

    this.lobbies.push({ floorIndex, rootGroup, proceduralGroup, photoGroup, floorMat });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), floorMat);
    floor.position.set(0, -0.04, centerZ);
    g.add(floor);

    if (!options.openRoof) {
      const wallMat = new THREE.MeshStandardMaterial({
        color: options.wallColor,
        roughness: 0.78,
        metalness: 0.08,
      });

      if (!options.openBack) {
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), wallMat);
        backWall.position.set(0, h / 2, -1.12 - d);
        g.add(backWall);

        const floorCfg = FLOORS[floorIndex];
        const signTex = createShaftFloorSignTexture(floorCfg.displayLabel, floorCfg.accentColor);
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(0.62, 0.62),
          new THREE.MeshBasicMaterial({ map: signTex })
        );
        sign.position.set(-1.6, 1.85, -1.12 - d + 0.1);
        g.add(sign);
      }

      [-w / 2, w / 2].forEach((x) => {
        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, d), wallMat);
        sideWall.position.set(x, h / 2, centerZ);
        g.add(sideWall);
      });

      const ceil = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.12, d),
        new THREE.MeshStandardMaterial({ color: options.ceilingColor ?? 0x1e2430, roughness: 0.85 })
      );
      ceil.position.set(0, h, centerZ);
      g.add(ceil);
    }

    return g;
  }

  private addFloorLight(
    parent: THREE.Group,
    floorIndex: number,
    color: number,
    intensity: number,
    pos: [number, number, number],
    distance = 10,
    flicker = false
  ): void {
    const light = new THREE.PointLight(color, intensity, distance, 1.35);
    light.position.set(...pos);
    // Attach light to rootGroup so floor ambient color spills into cabin even when using photographic backdrop
    (parent.parent ?? parent).add(light);
    this.floorLights.push({ floorIndex, light, baseIntensity: intensity, flicker });
  }

  /** B2：地下车库 */
  private buildB2Parking(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x26292e,
      wallColor: 0x2f343c,
      ceilingColor: 0x1d2026,
      floorRoughness: 0.9,
    });

    const hazardMat = new THREE.MeshStandardMaterial({ map: createHazardStripeTexture(), roughness: 0.7 });
    [-1.7, 1.7].forEach((x) => {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 3.1, 0.46),
        new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 })
      );
      col.position.set(x, 1.55, -3.4);
      g.add(col);

      const band = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.75, 0.48), hazardMat);
      band.position.set(x, 0.6, -3.4);
      g.add(band);
    });

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd9a726 });
    [-0.9, 1.4].forEach((x) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 3.2), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.01, -4.2);
      g.add(line);
    });

    const car = new THREE.Group();
    car.position.set(0.25, 0, -4.6);
    car.rotation.y = 0.22;
    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.56, 3.3),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 })
    );
    carBody.position.y = 0.48;
    car.add(carBody);

    const carRoof = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.46, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.2 })
    );
    carRoof.position.set(0, 0.96, -0.1);
    car.add(carRoof);

    [-0.58, 0.58].forEach((x) => {
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.11, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xff2d20 })
      );
      tail.position.set(x, 0.58, 1.66);
      car.add(tail);
    });
    g.add(car);

    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.06, 0.09),
      new THREE.MeshBasicMaterial({ color: 0xdbeafe })
    );
    tube.position.set(0, 2.94, -3.2);
    g.add(tube);

    this.addFloorLight(g, idx, 0x93c5fd, 4.2, [0, 2.75, -3.2], 11, true);
  }

  /** B1：设备机房 */
  private buildB1Utility(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x24272c,
      wallColor: 0x333842,
      ceilingColor: 0x1c2026,
      floorRoughness: 0.75,
    });

    const pipeSpecs: Array<[number, number]> = [
      [0xdc2626, 2.35],
      [0xeab308, 2.02],
      [0x2563eb, 1.69],
      [0x16a34a, 1.36],
    ];
    pipeSpecs.forEach(([color, y]) => {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 5.8, 14),
        new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.35 })
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, y, -6.35);
      g.add(pipe);
    });

    [-1.1, 0.3, 1.6].forEach((x) => {
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 2.0, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.45 })
      );
      cab.position.set(x, 1.0, -5.6);
      g.add(cab);

      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 10, 10),
        new THREE.MeshBasicMaterial({ color: x > 0 ? 0x22c55e : 0xf59e0b })
      );
      led.position.set(x + 0.25, 1.68, -5.27);
      g.add(led);
    });

    this.addFloorLight(g, idx, 0xfbbf24, 5.2, [0, 2.65, -3.4], 12);
  }

  /** 1F：现代大堂 */
  private build1FLobby(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0xd9d4c9,
      wallColor: 0xe7e2d8,
      ceilingColor: 0xf5f2eb,
      floorRoughness: 0.22,
      height: 3.4,
    });

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.04, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x3b2f26, roughness: 0.35, metalness: 0.15 })
    );
    desk.position.set(0.2, 0.52, -4.8);
    g.add(desk);

    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.72, 0.08, 0.82),
      new THREE.MeshStandardMaterial({ color: 0xf8f6f2, roughness: 0.18 })
    );
    deskTop.position.set(0.2, 1.08, -4.8);
    g.add(deskTop);

    const backdrop = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.45 })
    );
    backdrop.position.set(0.2, 1.75, -6.58);
    g.add(backdrop);

    const ringLogo = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.04, 14, 36),
      new THREE.MeshStandardMaterial({ color: 0xd4af6a, metalness: 0.9, roughness: 0.2 })
    );
    ringLogo.position.set(0.2, 1.95, -6.5);
    g.add(ringLogo);

    [-1.85, 2.05].forEach((x) => {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.2, 0.52, 16),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 })
      );
      pot.position.set(x, 0.26, -4.5);
      g.add(pot);

      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.46, 1),
        new THREE.MeshStandardMaterial({ color: 0x2f6b47, roughness: 0.75 })
      );
      foliage.position.set(x, 0.95, -4.5);
      g.add(foliage);
    });

    const chandelier = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.04, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff3d1 })
    );
    chandelier.rotation.x = Math.PI / 2;
    chandelier.position.set(0, 3.0, -3.5);
    g.add(chandelier);

    this.addFloorLight(g, idx, 0xfff3db, 7.2, [0, 2.9, -3.3], 13);
    this.addFloorLight(g, idx, 0xfde68a, 4.0, [0.2, 2.4, -5.2], 10);
  }

  /** 2F 咖啡吧 / 8F 空中餐厅 / 16F 云端酒吧 */
  private buildCafeOrBar(idx: number, variant: 'cafe' | 'bistro' | 'cloudbar'): void {
    const palette =
      variant === 'cafe'
        ? { floor: 0x4a3423, wall: 0x32251d, light: 0xfb923c, accent: 0xfdba74 }
        : variant === 'bistro'
          ? { floor: 0x3b2328, wall: 0x28181c, light: 0xfb7185, accent: 0xfda4af }
          : { floor: 0x161224, wall: 0x1d1633, light: 0xc084fc, accent: 0xe879f9 };

    const g = this.createLobbyShell(idx, {
      floorColor: palette.floor,
      wallColor: palette.wall,
      ceilingColor: 0x181520,
      floorRoughness: variant === 'cloudbar' ? 0.25 : 0.55,
    });

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.05, 0.78),
      new THREE.MeshStandardMaterial({
        color: variant === 'cloudbar' ? 0x2e1f4d : 0x6b4428,
        roughness: 0.4,
        metalness: variant === 'cloudbar' ? 0.45 : 0.1,
      })
    );
    counter.position.set(0, 0.525, -5.2);
    g.add(counter);

    const glowBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.74),
      new THREE.MeshBasicMaterial({ color: palette.accent })
    );
    glowBoard.position.set(0, 2.05, -6.58);
    g.add(glowBoard);

    [-1.4, 1.4].forEach((x) => {
      const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20),
        new THREE.MeshStandardMaterial({ color: 0x7c5132, roughness: 0.35 })
      );
      tableTop.position.set(x, 0.76, -3.4);
      g.add(tableTop);

      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.14, 0.76, 12),
        new THREE.MeshStandardMaterial({ color: 0x1c1917, metalness: 0.7 })
      );
      leg.position.set(x, 0.38, -3.4);
      g.add(leg);

      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 16),
        new THREE.MeshBasicMaterial({ color: palette.accent })
      );
      lamp.position.set(x, 2.25, -3.4);
      g.add(lamp);
    });

    this.addFloorLight(g, idx, palette.light, 6.2, [0, 2.5, -3.8], 12);
  }

  /** 3F：健身俱乐部 */
  private buildFitnessClub(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x22262e,
      wallColor: 0x2d333f,
      ceilingColor: 0x181b22,
      floorRoughness: 0.85,
    });

    // Stylized treadmills
    [-1.3, 0, 1.3].forEach((x) => {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.14, 1.7),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 })
      );
      base.position.set(x, 0.07, -4.4);
      g.add(base);

      const consoleStand = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.15, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 })
      );
      consoleStand.position.set(x, 0.65, -5.15);
      g.add(consoleStand);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.45, 0.26),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
      );
      screen.position.set(x, 1.05, -5.07);
      g.add(screen);
    });

    // Energetic coral LED ceiling bars
    [-1.5, 1.5].forEach((x) => {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, 4.2),
        new THREE.MeshBasicMaterial({ color: 0xfb7185 })
      );
      bar.position.set(x, 2.92, -3.8);
      g.add(bar);
    });

    this.addFloorLight(g, idx, 0xfda4af, 5.8, [0, 2.75, -3.7], 12);
  }

  /** 4F 共享办公 / 9F 深夜写字楼 */
  private buildOfficeTheme(idx: number, screenColor: number, wallColor: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x2c3545,
      wallColor,
      ceilingColor: 0xe5e9f0,
      floorRoughness: 0.85,
    });

    [-1.4, 0.6].forEach((x) => {
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.75, 0.75),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 })
      );
      desk.position.set(x, 0.375, -4.4);
      g.add(desk);

      const monitor = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.36, 0.04),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          emissive: new THREE.Color(screenColor),
          emissiveIntensity: 0.85,
        })
      );
      monitor.position.set(x, 1.02, -4.5);
      g.add(monitor);
    });

    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.2, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    exitSign.position.set(1.55, 2.55, -6.5);
    g.add(exitSign);

    this.addFloorLight(g, idx, 0xe0f2fe, 5.6, [0, 2.85, -3.5], 12);
  }

  /** 5F：静谧图书馆 */
  private buildLibrary(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x3f2d20,
      wallColor: 0x2e2017,
      ceilingColor: 0x211811,
      floorRoughness: 0.65,
    });

    // Tall wooden bookshelves with colorful book rows
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.6 });
    const bookColors = [0x991b1b, 0x1e3a8a, 0x166534, 0x92400e, 0x4c1d95];
    [-1.8, 0.2, 1.9].forEach((x) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 0.45), shelfMat);
      shelf.position.set(x, 1.25, -5.8);
      g.add(shelf);

      for (let row = 0; row < 4; row++) {
        const books = new THREE.Mesh(
          new THREE.BoxGeometry(1.06, 0.34, 0.32),
          new THREE.MeshStandardMaterial({ color: bookColors[(row + Math.abs(Math.round(x))) % bookColors.length] })
        );
        books.position.set(x, 0.45 + row * 0.56, -5.68);
        g.add(books);
      }
    });

    // Reading table with green banker's lamp
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.76, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x4b2e1b, roughness: 0.4 })
    );
    table.position.set(0, 0.38, -3.5);
    g.add(table);

    const lampShade = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    lampShade.position.set(0, 1.15, -3.5);
    g.add(lampShade);

    this.addFloorLight(g, idx, 0xfbbf24, 5.8, [0, 2.55, -3.7], 12);
  }

  /** 6F：创意设计工作室 */
  private buildDesignStudio(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0xe5e7eb,
      wallColor: 0xf8fafc,
      ceilingColor: 0xf1f5f9,
      floorRoughness: 0.4,
    });

    // Colorful geometric Bauhaus art blocks on wall & pedestals
    const colors = [0xef4444, 0xfacc15, 0x3b82f6];
    colors.forEach((c, i) => {
      const art = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 1.2, 0.08),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 })
      );
      art.position.set((i - 1) * 1.45, 1.65, -6.58);
      g.add(art);
    });

    const draftingTable = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.85, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35 })
    );
    draftingTable.position.set(0, 0.425, -4.0);
    g.add(draftingTable);

    this.addFloorLight(g, idx, 0xffffff, 6.8, [0, 2.85, -3.6], 13);
  }

  /** 7F：科技研发实验室 */
  private buildTechLab(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x0f172a,
      wallColor: 0x162238,
      ceilingColor: 0x0b1120,
      floorRoughness: 0.2,
    });

    // Holographic rotating wireframe globe in center
    const holo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.65, 2),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true })
    );
    holo.position.set(0, 1.55, -4.1);
    g.add(holo);

    this.animatedObjects.push((elapsed) => {
      holo.rotation.y = elapsed * 0.65;
      holo.rotation.z = elapsed * 0.25;
    });

    // Glowing server racks
    [-2.0, 2.0].forEach((x) => {
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 2.3, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 })
      );
      rack.position.set(x, 1.15, -4.9);
      g.add(rack);

      for (let r = 0; r < 6; r++) {
        const strip = new THREE.Mesh(
          new THREE.PlaneGeometry(0.62, 0.04),
          new THREE.MeshBasicMaterial({ color: r % 2 === 0 ? 0x22d3ee : 0x38bdf8 })
        );
        strip.position.set(x, 0.5 + r * 0.32, -4.49);
        g.add(strip);
      }
    });

    this.addFloorLight(g, idx, 0x22d3ee, 6.0, [0, 2.6, -3.8], 13);
  }

  /** 10F：高空玻璃观景连廊 */
  private buildSkyBridge(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x1e293b,
      wallColor: 0x334155,
      ceilingColor: 0x0f172a,
      openBack: true,
      floorRoughness: 0.18,
    });

    // Luminous walkway strips leading toward panoramic night horizon
    [-1.1, 1.1].forEach((x) => {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 5.4),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
      );
      strip.position.set(x, 0.02, -3.9);
      g.add(strip);
    });

    // Glass wall barrier at end of skybridge
    const endGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(6.0, 2.9),
      new THREE.MeshPhysicalMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.16, roughness: 0.1 })
    );
    endGlass.position.set(0, 1.45, -6.65);
    g.add(endGlass);

    this.addFloorLight(g, idx, 0x67e8f9, 5.5, [0, 2.7, -3.8], 12);
  }

  /** 11F：金融交易大厅 */
  private buildTradingFloor(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x111827,
      wallColor: 0x1e293b,
      ceilingColor: 0x0f172a,
      floorRoughness: 0.45,
    });

    // Stock ticker bands (green up & red down glowing panels)
    const bandColors = [0x10b981, 0xef4444, 0x10b981, 0x34d399];
    bandColors.forEach((c, i) => {
      const ticker = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 0.18),
        new THREE.MeshBasicMaterial({ color: c })
      );
      ticker.position.set(0, 1.2 + i * 0.42, -6.58);
      g.add(ticker);
    });

    this.addFloorLight(g, idx, 0x34d399, 5.4, [0, 2.7, -3.6], 12);
  }

  /** 12F：霓虹画廊 */
  private buildNeonGallery(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x0d0f18,
      wallColor: 0x111320,
      ceilingColor: 0x090b12,
      floorRoughness: 0.15,
    });

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.62, 0.86, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e1b2e, metalness: 0.6, roughness: 0.25 })
    );
    pedestal.position.set(0, 0.43, -4.1);
    g.add(pedestal);

    const sculpture = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.45, 0.13, 96, 16),
      new THREE.MeshStandardMaterial({
        color: 0xe879f9,
        emissive: new THREE.Color(0xa21caf),
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.18,
      })
    );
    sculpture.position.set(0, 1.65, -4.1);
    g.add(sculpture);

    this.animatedObjects.push((elapsed) => {
      sculpture.rotation.y = elapsed * 0.75;
      sculpture.rotation.x = Math.sin(elapsed * 0.6) * 0.35;
      sculpture.position.y = 1.65 + Math.sin(elapsed * 1.8) * 0.1;
    });

    [-2.1, 2.1].forEach((x, i) => {
      const neon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.7, 12),
        new THREE.MeshBasicMaterial({ color: i === 0 ? 0x22d3ee : 0xf472b6 })
      );
      neon.position.set(x, 1.45, -4.8);
      g.add(neon);
    });

    this.addFloorLight(g, idx, 0xe879f9, 5.8, [1.2, 2.2, -3.9], 11);
    this.addFloorLight(g, idx, 0x22d3ee, 5.4, [-1.4, 2.2, -3.9], 11);
  }

  /** 13F：禅意水景厅 */
  private buildZenSanctuary(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x2c332d,
      wallColor: 0x3b3830,
      ceilingColor: 0x26241f,
      floorRoughness: 0.5,
    });

    // Calm reflective water pool with stepping stones & bamboo stalks
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x134e4a, metalness: 0.85, roughness: 0.08 })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.02, -4.2);
    g.add(pool);

    for (let i = 0; i < 6; i++) {
      const bamboo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 2.9, 10),
        new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5 })
      );
      bamboo.position.set(-2.1 + i * 0.18, 1.45, -4.6 - (i % 2) * 0.4);
      g.add(bamboo);
    }

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7 })
    );
    lantern.position.set(0, 1.9, -4.3);
    g.add(lantern);

    this.addFloorLight(g, idx, 0xd9f99d, 5.2, [0, 2.3, -4.1], 12);
  }

  /** 14F：私享放映厅 */
  private buildCinemaLounge(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x291116,
      wallColor: 0x1a0b0e,
      ceilingColor: 0x12070a,
      floorRoughness: 0.8,
    });

    // Glowing wide movie screen
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 2.1),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
    );
    screen.position.set(0, 1.65, -6.58);
    g.add(screen);

    // Velvet cinema seats
    [-1.2, 0, 1.2].forEach((x) => {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.72, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 })
      );
      seat.position.set(x, 0.36, -3.7);
      g.add(seat);
    });

    this.addFloorLight(g, idx, 0xf87171, 4.5, [0, 2.6, -3.5], 12);
  }

  /** 15F：空中温室花园 */
  private buildSkyGarden(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x3b4d3b,
      wallColor: 0x1d3528,
      ceilingColor: 0x10221a,
      floorRoughness: 0.75,
    });

    const walkway = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.06, 5.4),
      new THREE.MeshStandardMaterial({ color: 0x7c5737, roughness: 0.65 })
    );
    walkway.position.set(0, 0.03, -3.8);
    g.add(walkway);

    const plantPositions: Array<[number, number, number]> = [
      [-1.7, 0, -2.9],
      [1.7, 0, -3.1],
      [-1.5, 0, -4.9],
      [1.6, 0, -5.0],
      [0, 0, -5.8],
    ];
    plantPositions.forEach(([x, , z], i) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.11, 1.1, 10),
        new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.8 })
      );
      trunk.position.set(x, 0.55, z);
      g.add(trunk);

      const canopy = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.62 + (i % 2) * 0.15, 1),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x22c55e : 0x16a34a, roughness: 0.7 })
      );
      canopy.position.set(x, 1.55, z);
      g.add(canopy);
    });

    const fireflies: THREE.Mesh[] = [];
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xbef264 });
    for (let i = 0; i < 12; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), orbMat);
      orb.position.set((Math.random() - 0.5) * 3.8, 0.8 + Math.random() * 1.6, -2.2 - Math.random() * 3.4);
      orb.userData.baseY = orb.position.y;
      orb.userData.phase = Math.random() * Math.PI * 2;
      g.add(orb);
      fireflies.push(orb);
    }
    this.animatedObjects.push((elapsed) => {
      fireflies.forEach((f) => {
        f.position.y = (f.userData.baseY as number) + Math.sin(elapsed * 2 + (f.userData.phase as number)) * 0.18;
      });
    });

    this.addFloorLight(g, idx, 0x86efac, 6.0, [0, 2.7, -3.7], 13);
  }

  /** 17F：行政会所 */
  private buildExecutiveClub(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x2b231d,
      wallColor: 0x3b2c22,
      ceilingColor: 0x1f1712,
      floorRoughness: 0.35,
    });

    // Luxury leather sofa & brass coffee table
    const sofa = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.78, 0.92),
      new THREE.MeshStandardMaterial({ color: 0x5c2d16, roughness: 0.45 })
    );
    sofa.position.set(0, 0.39, -5.2);
    g.add(sofa);

    const coffeeTable = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.38, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xd4af6a, metalness: 0.85, roughness: 0.22 })
    );
    coffeeTable.position.set(0, 0.19, -3.9);
    g.add(coffeeTable);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.04, 12, 36),
      new THREE.MeshBasicMaterial({ color: 0xfde047 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 2.85, -4.3);
    g.add(halo);

    this.addFloorLight(g, idx, 0xfde68a, 6.2, [0, 2.75, -4.1], 13);
  }

  /** 18F：顶层露天星空观景台 */
  private buildRooftop(idx: number): void {
    const g = this.createLobbyShell(idx, {
      floorColor: 0x262d3d,
      wallColor: 0x1e293b,
      openRoof: true,
      width: 7.4,
      depth: 6.4,
      floorRoughness: 0.6,
    });

    const railMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.2,
      roughness: 0.1,
    });

    const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.1), glassMat);
    backGlass.position.set(0, 0.55, -7.4);
    g.add(backGlass);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.05, 0.06), railMat);
    topRail.position.set(0, 1.12, -7.4);
    g.add(topRail);

    [-3.65, 3.65].forEach((x) => {
      const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 6.2), railMat);
      sideRail.position.set(x, 1.12, -4.3);
      g.add(sideRail);
    });

    // Radiant full moon high in night sky
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3 })
    );
    moon.position.set(2.4, 5.4, -18.5);
    g.add(moon);

    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.42, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
    );
    bench.position.set(0, 0.21, -5.6);
    g.add(bench);

    for (let i = 0; i < 18; i++) {
      const h = 4 + Math.random() * 10;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 + Math.random() * 1.4, h, 1.2),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      b.position.set((i - 8.5) * 2.1, h / 2 - 5.5, -15 - Math.random() * 6);
      g.add(b);
    }

    this.addFloorLight(g, idx, 0xa78bfa, 5.4, [0, 2.6, -4.0], 14);
  }

  /**
   * 同步 20 层外部世界高度，并剔除远离当前楼层的候梯厅与灯光以维持高帧率
   */
  public update(dt: number, elapsed: number, elevatorElevation: number): void {
    this.worldGroup.position.y = -elevatorElevation;
    // Smooth vertical parallax on far city skyline
    this.skyGroup.position.y = -elevatorElevation * 0.28;

    // Only render the single nearest lobby so adjacent floors can NEVER bleed through or z-fight,
    // while preloading photographic backdrops when within 1.5 floors
    const nearestFloor = Math.min(
      FLOORS.length - 1,
      Math.max(0, Math.round(elevatorElevation / FLOOR_HEIGHT))
    );
    const preloadDist = FLOOR_HEIGHT * 1.6;
    this.lobbies.forEach((entry) => {
      const dist = Math.abs(entry.floorIndex * FLOOR_HEIGHT - elevatorElevation);
      entry.rootGroup.visible = entry.floorIndex === nearestFloor;
      if (dist <= preloadDist && this.backdropManager.isReady()) {
        this.backdropManager.ensureLoaded(
          entry.floorIndex,
          entry.photoGroup,
          entry.proceduralGroup,
          entry.floorMat
        );
      }
    });

    this.floorLights.forEach((entry) => {
      const floorElev = entry.floorIndex * FLOOR_HEIGHT;
      const dist = Math.abs(floorElev - elevatorElevation);
      if (dist > FLOOR_HEIGHT * 1.35) {
        entry.light.intensity = 0;
      } else {
        const proximity = Math.max(0, 1 - dist / (FLOOR_HEIGHT * 1.35));
        let mod = 1;
        if (entry.flicker) {
          const n = Math.sin(elapsed * 23) * Math.sin(elapsed * 7.3);
          mod = n > 0.72 ? 0.32 : 1.0;
        }
        entry.light.intensity = entry.baseIntensity * proximity * mod;
      }
    });

    this.animatedObjects.forEach((fn) => fn(elapsed, dt));
  }
}
