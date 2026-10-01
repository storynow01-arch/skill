import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadOrbitron} from '@remotion/google-fonts/Orbitron';
import {loadFont as loadRajdhani} from '@remotion/google-fonts/Rajdhani';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {Easing, interpolate} from 'remotion';

export const TC = loadTC('normal', {weights: ['500', '700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const NUM = loadOrbitron('normal', {weights: ['700', '900']}).fontFamily;
export const EN = loadRajdhani('normal', {weights: ['600', '700']}).fontFamily;
export const MONO = loadMono('normal', {weights: ['400', '700']}).fontFamily;

export const FPS = 30;
export const W = 1920;
export const H = 1080;
// 128 BPM → 1 小節 = 1.875 s = 56.25 frames；分鏡切點對齊小節
export const BAR = (60 / 128) * 4 * FPS;
export const bar = (b: number) => Math.round(b * BAR);
export const TOTAL = bar(32); // 1800

export const C = {
  bg0: '#040814',
  bg1: '#081630',
  cyan: '#00E5FF',
  blue: '#2F7BFF',
  violet: '#9664FF',
  gold: '#FFC840',
  silver: '#D2DCE8',
  bronze: '#DC874B',
  white: '#ECF6FF',
  grey: '#7890AA',
  green: '#3CFFAA',
  orange: '#FFA046',
  pink: '#FF4696',
};

/** 0→1，帶 ease-out，可設定延遲與長度（frames） */
export const ease = (f: number, delay = 0, dur = 15) =>
  interpolate(f, [delay, delay + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

export const easeIO = (f: number, delay = 0, dur = 15) =>
  interpolate(f, [delay, delay + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

export const glow = (color: string, s = 1) =>
  `0 0 ${8 * s}px ${color}, 0 0 ${22 * s}px ${color}aa, 0 0 ${48 * s}px ${color}66`;
