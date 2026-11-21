import * as THREE from 'three';
import {
  createBrushedMetalTexture,
  createDirectoryTexture,
  createMarbleFloorTexture,
  createWoodPanelTexture,
} from '../utils/textures';
import { ControlPanel } from './ControlPanel';
import { FloorDisplay } from './FloorDisplay';
import { createRainGlassMaterial } from './RainGlassShader';

/**
 * 电梯轿厢 3D 场景构建器
 * 尺寸：宽 2.10m (X: -1.05..+1.05)，高 2.55m (Y: 0..2.55)，深 2.00m (Z: -1.00..+1.00)
 */
export class ElevatorCabin {
  public readonly group = new THREE.Group();
  public readonly controlPanel: ControlPanel;
  public readonly floorDisplay: FloorDisplay;

  private readonly leftDoor: THREE.Group;
  private readonly rightDoor: THREE.Group;
  private readonly outerLeftDoor: THREE.Mesh;
  private readonly outerRightDoor: THREE.Mesh;

  private readonly mainLight: THREE.PointLight;
  private readonly fillLight: THREE.PointLight;
  private readonly emergencyLight: THREE.PointLight;
  private readonly ceilingPanelMat: THREE.MeshStandardMaterial;
  private readonly coveStripMat: THREE.MeshStandardMaterial;
  private readonly emergencyBulbMat: THREE.MeshStandardMaterial;
  private readonly fanBlades: THREE.Group;
  private rainGlassMat!: THREE.ShaderMaterial;

  private emergencyMode = false;
  private alarmMode = false;
  private fanOn = false;
  private rainEnabled = true;
  private fanSpeed = 0;

  constructor() {
    this.floorDisplay = new FloorDisplay();
    this.controlPanel = new ControlPanel(this.floorDisplay);

    const brushedSteelTex = createBrushedMetalTexture('#bcc4ce', 20, false);
    const darkSteelTex = createBrushedMetalTexture('#3b424d', 18, false);
    const woodTex = createWoodPanelTexture();
    const marbleTex = createMarbleFloorTexture();

    const steelMat = new THREE.MeshStandardMaterial({
      map: brushedSteelTex,
      metalness: 0.58,
      roughness: 0.46,
      envMapIntensity: 0.5,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      map: darkSteelTex,
      metalness: 0.55,
      roughness: 0.5,
      envMapIntensity: 0.45,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xb89664,
      metalness: 0.68,
      roughness: 0.4,
      envMapIntensity: 0.55,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      metalness: 0.06,
      roughness: 0.62,
      envMapIntensity: 0.35,
    });

    // 1. Floor
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.14, 0.06, 2.06),
      new THREE.MeshStandardMaterial({
        map: marbleTex,
        metalness: 0.12,
        roughness: 0.44,
        envMapIntensity: 0.45,
      })
    );
    floorMesh.position.set(0, -0.03, 0);
    this.group.add(floorMesh);

    // Metallic door threshold sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.012, 0.12), steelMat);
    sill.position.set(0, 0.004, -1.01);
    this.group.add(sill);

    // 2. Ceiling + Lighting Fixtures
    const ceilingBase = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.08, 2.06), darkTrimMat);
    ceilingBase.position.set(0, 2.59, 0);
    this.group.add(ceilingBase);

    // Recessed soft ceiling diffuser panel
    this.ceilingPanelMat = new THREE.MeshStandardMaterial({
      color: 0xfff5e4,
      emissive: new THREE.Color(0xffe9c8),
      emissiveIntensity: 0.86,
      roughness: 0.55,
    });
    const ceilingLightPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.06), this.ceilingPanelMat);
    ceilingLightPanel.rotation.x = Math.PI / 2;
    ceilingLightPanel.position.set(0, 2.544, 0.05);
    this.group.add(ceilingLightPanel);

    // Brass ceiling light frame (non-overlapping corners to prevent z-fighting)
    const frameBars: Array<[number, number, number, number, number]> = [
      [1.32, 0.03, 0.03, 0, 0.59],
      [1.32, 0.03, 0.03, 0, -0.49],
      [0.03, 0.03, 1.05, -0.645, 0.05],
      [0.03, 0.03, 1.05, 0.645, 0.05],
    ];
    frameBars.forEach(([w, h, d, x, z]) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brassMat);
      bar.position.set(x, 2.54, z);
      this.group.add(bar);
    });

    // Warm LED cove light strips along side ceiling edges
    this.coveStripMat = new THREE.MeshStandardMaterial({
      color: 0xffe4b5,
      emissive: new THREE.Color(0xffd28e),
      emissiveIntensity: 1.1,
    });
    [-0.98, 0.98].forEach((x) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 1.88), this.coveStripMat);
      strip.position.set(x, 2.53, 0);
      this.group.add(strip);
    });

    // Ceiling Emergency / Alarm Beacon Light
    const beaconHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.075, 0.03, 20),
      darkTrimMat
    );
    beaconHousing.position.set(-0.78, 2.535, -0.72);
    this.group.add(beaconHousing);

    this.emergencyBulbMat = new THREE.MeshStandardMaterial({
      color: 0x4a1515,
      emissive: new THREE.Color(0xff2a1a),
      emissiveIntensity: 0.08,
      roughness: 0.25,
    });
    const beaconDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      this.emergencyBulbMat
    );
    beaconDome.rotation.x = Math.PI;
    beaconDome.position.set(-0.78, 2.522, -0.72);
    this.group.add(beaconDome);

    // Ceiling Ventilation Fan Grille & Rotating Blades
    const fanPos = new THREE.Vector3(0.74, 2.54, -0.68);
    const fanRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.012, 10, 24),
      darkTrimMat
    );
    fanRing.rotation.x = Math.PI / 2;
    fanRing.position.copy(fanPos);
    this.group.add(fanRing);

    const fanRecess = new THREE.Mesh(
      new THREE.CircleGeometry(0.125, 24),
      new THREE.MeshBasicMaterial({ color: 0x090c12 })
    );
    fanRecess.rotation.x = Math.PI / 2;
    fanRecess.position.set(fanPos.x, 2.543, fanPos.z);
    this.group.add(fanRecess);

    this.fanBlades = new THREE.Group();
    this.fanBlades.position.set(fanPos.x, 2.54, fanPos.z);
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.004, 0.105),
        steelMat
      );
      const angle = (i / 5) * Math.PI * 2;
      blade.position.set(Math.sin(angle) * 0.055, 0, Math.cos(angle) * 0.055);
      blade.rotation.y = angle;
      blade.rotation.z = 0.25;
      this.fanBlades.add(blade);
    }
    this.group.add(this.fanBlades);

    // 3. Side Walls (Left & Right)
    this.buildSideWall(-1.05, 1, woodMat, steelMat, brassMat, true);
    this.buildSideWall(1.05, -1, woodMat, steelMat, brassMat, false);

    // 4. Front Wall around Elevator Door (Z = -1.00)
    // Left return panel: X in [-1.05, -0.58], width 0.47
    const leftFrontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.47, 2.55, 0.05), steelMat);
    leftFrontPanel.position.set(-0.815, 1.275, -0.975);
    this.group.add(leftFrontPanel);

    // Right return panel (hosts Control Panel): X in [0.58, 1.05], width 0.47
    const rightFrontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.47, 2.55, 0.05), steelMat);
    rightFrontPanel.position.set(0.815, 1.275, -0.975);
    this.group.add(rightFrontPanel);

    // Top transom above door: exact width 1.16 (X in [-0.58, 0.58], Y in [2.12, 2.55]) — zero overlap with side panels
    const transom = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.43, 0.05), steelMat);
    transom.position.set(0, 2.335, -0.975);
    this.group.add(transom);

    // Dark door jamb surround: cleanly proud of front wall (Z front = -0.938 vs wall -0.950)
    // and stops before inner door track (Z = -1.012), with zero coplanar overlap
    const jambLeft = new THREE.Mesh(new THREE.BoxGeometry(0.044, 2.104, 0.068), darkTrimMat);
    jambLeft.position.set(-0.582, 1.058, -0.972);
    this.group.add(jambLeft);

    const jambRight = new THREE.Mesh(new THREE.BoxGeometry(0.044, 2.104, 0.068), darkTrimMat);
    jambRight.position.set(0.582, 1.058, -0.972);
    this.group.add(jambRight);

    // Top lintel sits cleanly atop left/right jambs (Y in [2.110, 2.156]) and slightly deeper to avoid corner coplanar flicker
    const jambTop = new THREE.Mesh(new THREE.BoxGeometry(1.208, 0.046, 0.072), darkTrimMat);
    jambTop.position.set(0, 2.133, -0.972);
    this.group.add(jambTop);

    // Outer landing door frame behind the sliding doors (Z in [-1.148, -1.116]) for clean doorway depth
    const outerJambLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.12, 0.032), darkTrimMat);
    outerJambLeft.position.set(-0.59, 1.06, -1.132);
    this.group.add(outerJambLeft);

    const outerJambRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.12, 0.032), darkTrimMat);
    outerJambRight.position.set(0.59, 1.06, -1.132);
    this.group.add(outerJambRight);

    const outerJambTop = new THREE.Mesh(new THREE.BoxGeometry(1.23, 0.05, 0.036), darkTrimMat);
    outerJambTop.position.set(0, 2.145, -1.132);
    this.group.add(outerJambTop);

    // Main LED Floor Indicator mounted on front transom
    const ledBox = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.19, 0.025), darkTrimMat);
    ledBox.position.set(0, 2.32, -0.946);
    this.group.add(ledBox);

    const ledScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.58, 0.16),
      new THREE.MeshBasicMaterial({ map: this.floorDisplay.texture })
    );
    ledScreen.position.set(0, 2.32, -0.932);
    this.group.add(ledScreen);

    // Mount Control Panel on the front-right return wall
    this.controlPanel.group.position.set(0.815, 1.44, -0.949);
    this.group.add(this.controlPanel.group);

    // 5. Dual Sliding Elevator Doors (Inner cabin doors + outer shaft doors)
    const doorMat = new THREE.MeshStandardMaterial({
      map: createBrushedMetalTexture('#aeb6c0', 22, false),
      metalness: 0.62,
      roughness: 0.44,
      envMapIntensity: 0.5,
    });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.88 });

    this.leftDoor = this.createDoorLeaf(doorMat, rubberMat, 'left');
    this.rightDoor = this.createDoorLeaf(doorMat, rubberMat, 'right');
    this.group.add(this.leftDoor, this.rightDoor);

    // Outer landing doors slightly further along -Z for realistic double-door thickness
    const outerDoorMat = new THREE.MeshStandardMaterial({
      map: darkSteelTex,
      metalness: 0.55,
      roughness: 0.5,
      envMapIntensity: 0.4,
    });
    this.outerLeftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.59, 2.12, 0.03), outerDoorMat);
    this.outerLeftDoor.position.set(-0.295, 1.06, -1.095);
    this.outerRightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.59, 2.12, 0.03), outerDoorMat);
    this.outerRightDoor.position.set(0.295, 1.06, -1.095);
    this.group.add(this.outerLeftDoor, this.outerRightDoor);

    // 6. Back Panoramic Observation Glass Wall (Z = +1.00)
    this.buildBackObservationWindow(darkTrimMat, steelMat, brassMat);

    // 7. Cabin Interior Lighting Rig
    this.mainLight = new THREE.PointLight(0xfff2dc, 2.9, 7.2, 1.45);
    this.mainLight.position.set(0, 2.36, 0.02);
    this.group.add(this.mainLight);

    this.fillLight = new THREE.PointLight(0xdbeafe, 0.72, 5.5, 1.6);
    this.fillLight.position.set(0.35, 1.45, -0.45);
    this.group.add(this.fillLight);

    this.emergencyLight = new THREE.PointLight(0xff2b1a, 0, 6.5, 1.4);
    this.emergencyLight.position.set(-0.75, 2.42, -0.68);
    this.group.add(this.emergencyLight);
  }

  private buildSideWall(
    xPos: number,
    inwardSign: 1 | -1,
    woodMat: THREE.Material,
    steelMat: THREE.Material,
    brassMat: THREE.Material,
    includeDirectory: boolean
  ): void {
    // Wall backing
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.55, 2.04), woodMat);
    wall.position.set(xPos - inwardSign * 0.025, 1.275, 0);
    this.group.add(wall);

    // Baseboard kickplate
    const kick = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.14, 1.98), steelMat);
    kick.position.set(xPos + inwardSign * 0.008, 0.07, 0);
    this.group.add(kick);

    // Vertical brass trim inlays
    [-0.55, 0.55].forEach((z) => {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.012, 2.4, 0.022), brassMat);
      trim.position.set(xPos + inwardSign * 0.006, 1.32, z);
      this.group.add(trim);
    });

    // Tubular stainless handrail
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 1.62, 16), steelMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(xPos + inwardSign * 0.068, 0.92, 0.02);
    this.group.add(rail);

    // Handrail brackets
    [-0.64, 0.68].forEach((z) => {
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.068, 10), brassMat);
      bracket.rotation.z = Math.PI / 2;
      bracket.position.set(xPos + inwardSign * 0.034, 0.92, z);
      this.group.add(bracket);
    });

    // Floor directory plaque on the left wall (wider 4:5 frame for 20-floor two-column directory)
    if (includeDirectory) {
      const dirFrame = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.02, 0.84), brassMat);
      dirFrame.position.set(xPos + inwardSign * 0.012, 1.62, -0.02);
      this.group.add(dirFrame);

      const dirFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.80, 0.98),
        new THREE.MeshStandardMaterial({
          map: createDirectoryTexture(),
          metalness: 0.25,
          roughness: 0.35,
        })
      );
      dirFace.rotation.y = inwardSign > 0 ? Math.PI / 2 : -Math.PI / 2;
      dirFace.position.set(xPos + inwardSign * 0.023, 1.62, -0.02);
      this.group.add(dirFace);
    } else {
      // Right wall: subtle tall accent mirror panel
      const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.12, 0.86), brassMat);
      mirrorFrame.position.set(xPos + inwardSign * 0.01, 1.66, 0.05);
      this.group.add(mirrorFrame);

      const mirrorGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.82, 1.08),
        new THREE.MeshStandardMaterial({
          color: 0x3b4452,
          metalness: 0.78,
          roughness: 0.18,
          envMapIntensity: 0.45,
        })
      );
      mirrorGlass.rotation.y = -Math.PI / 2;
      mirrorGlass.position.set(xPos + inwardSign * 0.02, 1.66, 0.05);
      this.group.add(mirrorGlass);
    }
  }

  private createDoorLeaf(
    doorMat: THREE.Material,
    rubberMat: THREE.Material,
    side: 'left' | 'right'
  ): THREE.Group {
    const leaf = new THREE.Group();
    const width = 0.58;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 2.11, 0.036), doorMat);
    mesh.position.set(0, 1.055, 0);
    leaf.add(mesh);

    // Rubber safety edge strip where the two doors meet (cleanly aligned at X = 0 without overlapping)
    const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.011, 2.11, 0.04), rubberMat);
    rubber.position.set(side === 'left' ? width / 2 - 0.006 : -width / 2 + 0.006, 1.055, 0);
    leaf.add(rubber);

    // Subtle horizontal brushed groove accent
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.08, 0.008, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x7e8794, metalness: 0.8, roughness: 0.3 })
    );
    groove.position.set(0, 1.06, 0);
    leaf.add(groove);

    leaf.position.set(side === 'left' ? -0.29 : 0.29, 0, -1.03);
    return leaf;
  }

  private buildBackObservationWindow(
    darkTrimMat: THREE.Material,
    steelMat: THREE.Material,
    brassMat: THREE.Material
  ): void {
    // Bottom kick wall (Y: 0..0.38)
    const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.38, 0.06), darkTrimMat);
    lowerWall.position.set(0, 0.19, 1.02);
    this.group.add(lowerWall);

    // Top header beam (Y: 2.38..2.55)
    const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.18, 0.06), darkTrimMat);
    upperBeam.position.set(0, 2.46, 1.02);
    this.group.add(upperBeam);

    // Side structural mullions
    [-1.01, 1.01].forEach((x) => {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.55, 0.07), darkTrimMat);
      mullion.position.set(x, 1.275, 1.02);
      this.group.add(mullion);
    });

    // Panoramic tempered glass pane with dynamic raindrop refraction shader
    this.rainGlassMat = createRainGlassMaterial();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 2.02), this.rainGlassMat);
    glass.position.set(0, 1.38, 1.015);
    this.group.add(glass);

    // Protective rear stainless guardrails across the panoramic glass
    [0.86, 1.02].forEach((y) => {
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.94, 14), steelMat);
      guard.rotation.z = Math.PI / 2;
      guard.position.set(0, y, 0.95);
      this.group.add(guard);
    });
    [-0.95, 0.95].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.72, 12), brassMat);
      post.position.set(x, 0.7, 0.95);
      this.group.add(post);
    });
  }

  public setEmergencyMode(on: boolean): void {
    this.emergencyMode = on;
  }

  public setAlarmMode(on: boolean): void {
    this.alarmMode = on;
  }

  public setFanMode(on: boolean): void {
    this.fanOn = on;
  }

  public setRainMode(on: boolean): void {
    this.rainEnabled = on;
  }

  public update(dt: number, elapsed: number, doorProgress: number): void {
    // Update rear glass raindrop shader smoothly
    if (this.rainGlassMat) {
      this.rainGlassMat.uniforms.uTime.value = elapsed;
      const targetRain = this.rainEnabled ? 0.88 : 0.0;
      const curr = this.rainGlassMat.uniforms.uRainStrength.value as number;
      this.rainGlassMat.uniforms.uRainStrength.value = curr + (targetRain - curr) * Math.min(1, dt * 3.0);
    }
    // Smooth ease-in-out curve for sliding door leaves
    const easedDoor =
      doorProgress < 0.5
        ? 2 * doorProgress * doorProgress
        : 1 - Math.pow(-2 * doorProgress + 2, 2) / 2;

    const slideOffset = easedDoor * 0.545;
    this.leftDoor.position.x = -0.29 - slideOffset;
    this.rightDoor.position.x = 0.29 + slideOffset;
    this.outerLeftDoor.position.x = -0.295 - slideOffset * 1.02;
    this.outerRightDoor.position.x = 0.295 + slideOffset * 1.02;

    // Fan blade inertia spin
    const targetFanSpeed = this.fanOn ? 11.5 : 0;
    this.fanSpeed += (targetFanSpeed - this.fanSpeed) * Math.min(1, dt * 2.5);
    this.fanBlades.rotation.y += this.fanSpeed * dt;

    // Cabin lighting transitions (Normal vs Emergency Backup Power vs Alarm Flashing)
    const targetMain = this.emergencyMode ? 0.25 : 2.9;
    const targetFill = this.emergencyMode ? 0.12 : 0.72;
    const targetCeilingEmissive = this.emergencyMode ? 0.04 : 0.86;

    this.mainLight.intensity += (targetMain - this.mainLight.intensity) * Math.min(1, dt * 8);
    this.fillLight.intensity += (targetFill - this.fillLight.intensity) * Math.min(1, dt * 8);
    this.ceilingPanelMat.emissiveIntensity +=
      (targetCeilingEmissive - this.ceilingPanelMat.emissiveIntensity) * Math.min(1, dt * 8);
    this.coveStripMat.emissiveIntensity = this.emergencyMode ? 0.1 : 0.78;

    if (this.alarmMode) {
      const strobe = 0.5 + 0.5 * Math.sin(elapsed * 11);
      this.emergencyLight.intensity = 1.1 + strobe * 4.5;
      this.emergencyBulbMat.emissiveIntensity = 0.4 + strobe * 3.2;
    } else if (this.emergencyMode) {
      this.emergencyLight.intensity = 2.6;
      this.emergencyBulbMat.emissiveIntensity = 2.0;
    } else {
      this.emergencyLight.intensity = 0;
      this.emergencyBulbMat.emissiveIntensity = 0.08;
    }

    this.controlPanel.update(dt, elapsed);
  }
}
