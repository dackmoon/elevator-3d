export interface FloorConfig {
  index: number; // 0..19 (20 floors total: B2, B1, 1F..18F)
  code: string; // 'B2', 'B1', '1', ..., '18'
  displayLabel: string; // 'B2', '1F', ..., '18F'
  nameZh: string;
  nameEn: string;
  accentColor: string;
}

export const FLOOR_HEIGHT = 4.2; // meters between floors

export const FLOORS: FloorConfig[] = [
  { index: 0, code: 'B2', displayLabel: 'B2', nameZh: '地下车库', nameEn: 'PARKING P2', accentColor: '#60a5fa' },
  { index: 1, code: 'B1', displayLabel: 'B1', nameZh: '设备机房', nameEn: 'UTILITY LEVEL', accentColor: '#f59e0b' },
  { index: 2, code: '1', displayLabel: '1F', nameZh: '现代大堂', nameEn: 'GRAND LOBBY', accentColor: '#fde68a' },
  { index: 3, code: '2', displayLabel: '2F', nameZh: '午夜咖啡吧', nameEn: 'LOUNGE CAFE', accentColor: '#fb923c' },
  { index: 4, code: '3', displayLabel: '3F', nameZh: '健身俱乐部', nameEn: 'FITNESS CLUB', accentColor: '#f43f5e' },
  { index: 5, code: '4', displayLabel: '4F', nameZh: '共享办公区', nameEn: 'CO-WORKING', accentColor: '#38bdf8' },
  { index: 6, code: '5', displayLabel: '5F', nameZh: '静谧图书馆', nameEn: 'QUIET LIBRARY', accentColor: '#d97706' },
  { index: 7, code: '6', displayLabel: '6F', nameZh: '创意工作室', nameEn: 'DESIGN STUDIO', accentColor: '#facc15' },
  { index: 8, code: '7', displayLabel: '7F', nameZh: '科技研发层', nameEn: 'TECH LAB', accentColor: '#06b6d4' },
  { index: 9, code: '8', displayLabel: '8F', nameZh: '空中餐厅', nameEn: 'SKY BISTRO', accentColor: '#fb7185' },
  { index: 10, code: '9', displayLabel: '9F', nameZh: '深夜写字楼', nameEn: 'NIGHT OFFICE', accentColor: '#60a5fa' },
  { index: 11, code: '10', displayLabel: '10F', nameZh: '空中连廊', nameEn: 'SKY BRIDGE', accentColor: '#67e8f9' },
  { index: 12, code: '11', displayLabel: '11F', nameZh: '金融交易层', nameEn: 'TRADING FLOOR', accentColor: '#34d399' },
  { index: 13, code: '12', displayLabel: '12F', nameZh: '霓虹画廊', nameEn: 'NEON GALLERY', accentColor: '#e879f9' },
  { index: 14, code: '13', displayLabel: '13F', nameZh: '禅意水景厅', nameEn: 'ZEN SANCTUARY', accentColor: '#a3e635' },
  { index: 15, code: '14', displayLabel: '14F', nameZh: '私享放映厅', nameEn: 'CINEMA LOUNGE', accentColor: '#f87171' },
  { index: 16, code: '15', displayLabel: '15F', nameZh: '空中温室', nameEn: 'SKY GARDEN', accentColor: '#4ade80' },
  { index: 17, code: '16', displayLabel: '16F', nameZh: '云端酒吧', nameEn: 'CLOUD BAR', accentColor: '#c084fc' },
  { index: 18, code: '17', displayLabel: '17F', nameZh: '行政会所', nameEn: 'EXECUTIVE CLUB', accentColor: '#eab308' },
  { index: 19, code: '18', displayLabel: '18F', nameZh: '星空天台', nameEn: 'STAR ROOFTOP', accentColor: '#a78bfa' },
];

export const INITIAL_FLOOR_INDEX = 2; // 1F

export type ElevatorState = 'IDLE' | 'CLOSING' | 'MOVING' | 'OPENING' | 'OPEN';
export type MoveDirection = -1 | 0 | 1;

export type ButtonActionId =
  | `floor:${number}`
  | 'door:open'
  | 'door:close'
  | 'sys:alarm'
  | 'sys:light'
  | 'sys:fan';

export interface CameraPreset {
  id: 'default' | 'panel' | 'window' | 'directory';
  label: string;
  yaw: number;
  pitch: number;
  fov: number;
  position: [number, number, number];
}
