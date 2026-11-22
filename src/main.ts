import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import './style.css';
import { SoundEngine } from './audio/SoundEngine';
import { CameraRig } from './core/CameraRig';
import { ElevatorFSM } from './core/ElevatorFSM';
import { Interaction } from './core/Interaction';
import { ElevatorCabin } from './scene/ElevatorCabin';
import { FloorWorlds } from './scene/FloorWorlds';
import { ButtonActionId, FLOORS } from './types';
import { HudOverlay } from './ui/HudOverlay';

function bootstrap(): void {
  const container = document.getElementById('app')!;

  // 1. Renderer setup with cinema-grade tone mapping
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // 2. Scene, physical environment reflection map & night atmosphere
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a14);
  scene.fog = new THREE.FogExp2(0x060a14, 0.015);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.16;
  pmremGenerator.dispose();

  // Soft hemisphere fill
  scene.add(new THREE.HemisphereLight(0xcbd5e1, 0x1e293b, 0.3));

  // 3. Build 3D Cabin & External Worlds
  const cabin = new ElevatorCabin();
  const worlds = new FloorWorlds();
  scene.add(worlds.skyGroup);
  scene.add(worlds.worldGroup);
  scene.add(cabin.group);

  // 4. Audio Engine (unlock cleanly on first touch/click for iPadOS Safari)
  const sound = new SoundEngine();
  window.addEventListener('pointerdown', () => sound.unlock(), { once: true });

  // 5. Cabin utility toggles
  let emergencyLight = false;
  let alarmActive = false;
  let fanActive = false;
  let rainActive = true;

  // 6. Elevator Finite State Machine
  const elevator = new ElevatorFSM({
    onDoorOpening: () => sound.playDoorMove(true),
    onDoorClosing: () => sound.playDoorMove(false),
    onArrive: (floorIndex, dir) => {
      sound.playArrivalChime(dir);
      const floor = FLOORS[floorIndex];
      hud.showToast(`已到达 ${floor.displayLabel} · ${floor.nameZh}`);
    },
  });

  // 7. Camera Rig, Post-Processing Composer (Bloom) & HUD
  let hud!: HudOverlay;
  const cameraRig = new CameraRig(
    window.innerWidth / window.innerHeight,
    renderer.domElement,
    (presetId) => hud?.setActivePreset(presetId)
  );

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cameraRig.camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.24, // restrained cinematic bloom so cabin metal never glares
    0.4,  // bloom radius
    0.96  // high threshold: only emissive LEDs, buttons, neon & lamps bloom
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  hud = new HudOverlay(container, {
    onSelectPreset: (id) => cameraRig.applyPreset(id),
    onToggleMute: () => {
      sound.unlock();
      const next = !sound.isMuted();
      sound.setMuted(next);
      return next;
    },
    onToggleRain: () => {
      sound.unlock();
      rainActive = !rainActive;
      cabin.setRainMode(rainActive);
      sound.setRainAmbiance(rainActive);
      hud.showToast(rainActive ? '已切换至雨夜模式（观光后窗有雨滴效果）' : '已切换至晴朗夜空模式');
      return rainActive;
    },
  });

  // 8. Button Action Dispatcher
  const handleButtonPress = (id: ButtonActionId, isDoubleClick = false): void => {
    sound.unlock();
    cabin.controlPanel.triggerPressAnimation(id);

    if (id.startsWith('floor:')) {
      const floorIdx = Number(id.split(':')[1]);
      if (isDoubleClick) {
        if (elevator.cancelFloor(floorIdx)) {
          sound.playCancelClick();
          hud.showToast(`已取消前往 ${FLOORS[floorIdx].displayLabel}`);
        }
        return;
      }

      const result = elevator.requestFloor(floorIdx);
      sound.playButtonClick(0.9 + floorIdx * 0.018);
      if (result === 'already-here') {
        hud.showToast(`当前已在 ${FLOORS[floorIdx].displayLabel} · ${FLOORS[floorIdx].nameZh}`);
      }
      return;
    }

    switch (id) {
      case 'door:open':
        sound.playButtonClick(1.1);
        elevator.pressOpenDoor();
        break;
      case 'door:close':
        sound.playButtonClick(0.9);
        elevator.pressCloseDoor();
        break;
      case 'sys:alarm':
        alarmActive = !alarmActive;
        sound.playButtonClick(alarmActive ? 1.3 : 0.8);
        sound.setAlarm(alarmActive);
        cabin.setAlarmMode(alarmActive);
        cabin.controlPanel.setButtonLit('sys:alarm', alarmActive);
        hud.showToast(alarmActive ? '紧急警铃已启动（再次点击关闭）' : '紧急警铃已解除');
        break;
      case 'sys:light':
        emergencyLight = !emergencyLight;
        sound.playRelaySwitch();
        cabin.setEmergencyMode(emergencyLight);
        cabin.controlPanel.setButtonLit('sys:light', emergencyLight);
        hud.showToast(emergencyLight ? '已切换至应急备用照明模式' : '已恢复主照明');
        break;
      case 'sys:fan':
        fanActive = !fanActive;
        sound.playButtonClick(1.05);
        sound.setFan(fanActive);
        cabin.setFanMode(fanActive);
        cabin.controlPanel.setButtonLit('sys:fan', fanActive);
        hud.showToast(fanActive ? '顶部换气扇已开启' : '顶部换气扇已关闭');
        break;
    }
  };

  // 9. 3D Raycast Interaction
  new Interaction(renderer.domElement, cameraRig, cabin.controlPanel.hitMeshes, {
    onHover: (id) => {
      cabin.controlPanel.setHovered(id);
      hud.setTooltip(cabin.controlPanel.getTooltip(id));
    },
    onClick: (id) => handleButtonPress(id, false),
    onDoubleClick: (id) => handleButtonPress(id, true),
  });

  // 10. Keyboard Shortcuts (1-9 => 1F-9F, 0 => 10F, - => B2, = => B1)
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key >= '1' && key <= '9') {
      handleButtonPress(`floor:${Number(key) + 1}` as ButtonActionId);
    } else if (key === '0') {
      handleButtonPress('floor:11'); // 10F
    } else if (key === '=') {
      handleButtonPress('floor:1'); // B1
    } else if (key === '-') {
      handleButtonPress('floor:0'); // B2
    } else if (key === 'o') {
      handleButtonPress('door:open');
    } else if (key === 'c') {
      handleButtonPress('door:close');
    } else if (key === 'l') {
      handleButtonPress('sys:light');
    } else if (key === 'f') {
      handleButtonPress('sys:fan');
    } else if (key === 'r') {
      cameraRig.applyPreset('default');
    } else if (key === 'm') {
      sound.unlock();
      const next = !sound.isMuted();
      sound.setMuted(next);
      hud.setMuteVisual(next);
    }
  });

  // 11. Resize Handling
  window.addEventListener('resize', () => {
    cameraRig.resize(window.innerWidth, window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  // 12. Main Render Loop
  const clock = new THREE.Clock();

  const animate = (): void => {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const elapsed = clock.elapsedTime;

    // Step Elevator FSM & Physics
    elevator.update(dt);

    // Sync floor button lit states with queued floors
    FLOORS.forEach((f) => {
      cabin.controlPanel.setButtonLit(`floor:${f.index}`, elevator.queuedFloors.has(f.index));
    });
    cabin.controlPanel.setButtonLit('door:open', elevator.state === 'OPENING');
    cabin.controlPanel.setButtonLit('door:close', elevator.state === 'CLOSING');

    // Update 3D displays, cabin, external worlds, motor audio & camera physics
    cabin.floorDisplay.update(
      dt,
      elevator.currentFloor,
      elevator.direction,
      elevator.state,
      alarmActive,
      emergencyLight
    );
    cabin.update(dt, elapsed, elevator.doorProgress);
    worlds.update(dt, elapsed, elevator.elevation);
    sound.updateMotor(elevator.velocity / elevator.maxSpeedValue);
    cameraRig.update(dt, elapsed, elevator.velocity, elevator.acceleration, elevator.maxSpeedValue);

    // Sync HUD
    hud.updateStatus(elevator.currentFloor, elevator.direction, elevator.state, elevator.queuedFloors);

    composer.render();
  };

  animate();
}

bootstrap();
