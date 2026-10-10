/* 主角：色鉛筆畫的小人（圓頭、背包、會走路的腿，姿勢跟著時間表換），和交通車（車身字讀 storyboard）。原作：第 13 支 ad13/kid.tsx。 */
import React from 'react';
import {G, Ln, Pt, Sh, Tx, ell, rect, rrect} from './draw';

const SKIN = '#ffd6b5';
const INK = '#4a3328';
const PANTS = '#4b5f9f';
const SHIRT = '#8ccbe8';
const BAG = '#f07f55';
const SHOE = '#e8574a';

export type Pose = 'stand' | 'walk' | 'run' | 'sit' | 'crouch' | 'jump' | 'reach' | 'wave' | 'look';

const D2R = Math.PI / 180;
const leg = (hip: Pt, a: number, bend: number, L1 = 32, L2 = 33): Pt[] => {
  const k: Pt = [hip[0] + Math.sin(a * D2R) * L1, hip[1] + Math.cos(a * D2R) * L1];
  const f: Pt = [k[0] + Math.sin((a - bend) * D2R) * L2, k[1] + Math.cos((a - bend) * D2R) * L2];
  return [hip, k, f];
};
const arm = (sh: Pt, a: number, bend: number): Pt[] => {
  const e: Pt = [sh[0] + Math.sin(a * D2R) * 26, sh[1] + Math.cos(a * D2R) * 26];
  const h: Pt = [e[0] + Math.sin((a + bend) * D2R) * 25, e[1] + Math.cos((a + bend) * D2R) * 25];
  return [sh, e, h];
};

/** 粗線肢體：先畫鉛筆深色外框，再畫顏色 */
const Limb: React.FC<{p: Pt[]; c: string; w: number; id: string}> = ({p, c, w, id}) => (
  <g>
    <Ln p={p} id={id + 'a'} ink={INK} sw={w + 5} amp={0.8} />
    <Ln p={p} id={id + 'b'} ink={c} sw={w} amp={0.5} />
  </g>
);

/** 主角（腳底中心為原點、面向右） */
export const Kid: React.FC<{pose: Pose; ph?: number; bag?: boolean; blink?: boolean; id?: string; shirt?: string; hair?: string}> = ({
  pose, ph = 0, bag = true, blink = false, id = 'k', shirt = SHIRT, hair = '#5a3a2a',
}) => {
  // ───── 姿勢參數 ─────
  let a1 = 0, b1 = 4, a2 = 0, b2 = 4, arm1 = -8, arm1b = -20, arm2 = 8, arm2b = -20, dy = 0, hip: Pt = [0, -64], tilt = 0;
  const th = (ph % 4) * (Math.PI / 2);
  if (pose === 'walk' || pose === 'run') {
    const amp = pose === 'run' ? 40 : 26;
    a1 = amp * Math.sin(th);
    a2 = -a1;
    b1 = 8 + (pose === 'run' ? 50 : 30) * Math.max(0, -Math.cos(th));
    b2 = 8 + (pose === 'run' ? 50 : 30) * Math.max(0, Math.cos(th));
    arm1 = -a1 * 1.1;
    arm2 = a1 * 1.1;
    arm1b = pose === 'run' ? 70 : 20;
    arm2b = pose === 'run' ? 70 : 20;
    dy = ph % 2 === 1 ? -5 : 0;
    tilt = pose === 'run' ? 8 : 2;
  } else if (pose === 'sit') {
    hip = [0, -64 + 30];
    a1 = 90; b1 = 90; a2 = 84; b2 = 84;
    arm1 = 70; arm1b = -10; arm2 = 60; arm2b = 0;
    dy = 0;
  } else if (pose === 'reach') {
    hip = [0, -34];
    a1 = 90; b1 = 90; a2 = 84; b2 = 84;
    arm1 = 120; arm1b = -20; arm2 = 60; arm2b = 0;
  } else if (pose === 'crouch') {
    hip = [-6, -46];
    a1 = 60; b1 = 110; a2 = 50; b2 = 100;
    arm1 = -40; arm1b = 10; arm2 = -30; arm2b = 10;
    tilt = 14;
  } else if (pose === 'jump') {
    a1 = 50; b1 = 100; a2 = 30; b2 = 90;
    arm1 = 160; arm1b = 10; arm2 = 150; arm2b = 10;
    tilt = 10;
  } else if (pose === 'wave') {
    arm1 = 165; arm1b = (ph % 2) * 30 - 15;
  }
  const bodyY = hip[1] + 64 + dy; // 上半身整體位移
  const sh1: Pt = [6, -136 + bodyY];
  const sh2: Pt = [-4, -136 + bodyY];
  const H: Pt = [6, -192 + bodyY];
  const l1 = leg([hip[0] + 4, hip[1] + dy], a1, b1);
  const l2 = leg([hip[0] - 4, hip[1] + dy], a2, b2);
  return (
    <g transform={tilt ? `rotate(${tilt} 0 ${hip[1]})` : undefined}>
      {/* 後腳、後手 */}
      <Limb p={l2} c={PANTS} w={13} id={id + 'l2'} />
      <Sh p={ell(l2[2][0] + 6, l2[2][1] - 2, 13, 7, 10)} fill={SHOE} ink={INK} id={id + 's2'} sw={2.5} hatch={0} />
      <Limb p={arm(sh2, arm2, arm2b)} c={SKIN} w={9} id={id + 'a2'} />
      {/* 書包 */}
      {bag ? (
        <g>
          <Sh p={rrect(-52, -150 + bodyY, 34, 74, 8)} fill={BAG} ink={INK} id={id + 'bag'} sw={2.6} />
          <Sh p={rrect(-54, -152 + bodyY, 30, 28, 7)} fill="#d9603a" ink={INK} id={id + 'flap'} sw={2.2} hatch={2} />
        </g>
      ) : null}
      {/* 身體 */}
      <Sh p={rrect(-24, -150 + bodyY, 50, 92, 14)} fill={shirt} ink={INK} id={id + 'body'} sw={2.8} />
      <Ln p={[[-6, -148 + bodyY], [6, -136 + bodyY], [18, -148 + bodyY]]} id={id + 'col'} ink="#2f4f86" sw={3} />
      {bag ? <Ln p={[[-16, -148 + bodyY], [-4, -118 + bodyY], [6, -88 + bodyY]]} id={id + 'str'} ink="#b34a2b" sw={5} /> : null}
      {/* 前腳 */}
      <Limb p={l1} c={PANTS} w={13} id={id + 'l1'} />
      <Sh p={ell(l1[2][0] + 6, l1[2][1] - 2, 13, 7, 10)} fill={SHOE} ink={INK} id={id + 's1'} sw={2.5} hatch={0} />
      {/* 頭 */}
      <Sh p={ell(H[0] - 6, H[1] - 12, 47, 42, 20)} fill={hair} ink={INK} id={id + 'hair'} sw={2.6} />
      <Sh p={ell(H[0] + 4, H[1] + 4, 40, 39, 20)} fill={SKIN} ink={INK} id={id + 'face'} sw={2.6} />
      <Sh p={[[H[0] - 30, H[1] - 26], [H[0] + 8, H[1] - 44], [H[0] + 40, H[1] - 22], [H[0] + 30, H[1] - 14], [H[0] + 6, H[1] - 26], [H[0] - 26, H[1] - 8]]} fill={hair} ink={INK} id={id + 'fr'} sw={2.4} />
      <Sh p={ell(H[0] - 22, H[1] + 6, 8, 10, 10)} fill={SKIN} ink={INK} id={id + 'ear'} sw={2.2} hatch={0} />
      {blink ? (
        <Ln p={[[H[0] + 20, H[1] + 2], [H[0] + 30, H[1] + 2]]} id={id + 'eyeb'} ink="#2a1d18" sw={3.5} />
      ) : (
        <ellipse cx={H[0] + 25} cy={H[1] + 0} rx={4.6} ry={6.6} fill="#2a1d18" />
      )}
      <ellipse cx={H[0] + 30} cy={H[1] + 18} rx={8} ry={5} fill="#ff8f8f" opacity={0.55} />
      <Ln p={[[H[0] + 16, H[1] + 22], [H[0] + 23, H[1] + 27], [H[0] + 32, H[1] + 24]]} id={id + 'm'} ink="#7a3326" sw={2.6} />
      {/* 前手 */}
      <Limb p={arm(sh1, arm1, arm1b)} c={SKIN} w={9} id={id + 'a1'} />
    </g>
  );
};

/** 只露頭（車窗裡、泳池水面上、被窩裡） */
export const Head: React.FC<{id: string; wet?: boolean; sleep?: boolean}> = ({id, wet = false, sleep = false}) => (
  <g>
    <Sh p={ell(-6, -12, 47, 42, 20)} fill={wet ? '#3e2a20' : '#5a3a2a'} ink={INK} id={id + 'hair'} sw={2.6} />
    <Sh p={ell(4, 4, 40, 39, 20)} fill={SKIN} ink={INK} id={id + 'face'} sw={2.6} />
    <Sh p={[[-30, -26], [8, -44], [40, -22], [30, -14], [6, -26], [-26, -8]]} fill={wet ? '#3e2a20' : '#5a3a2a'} ink={INK} id={id + 'fr'} sw={2.4} />
    {sleep ? (
      <Ln p={[[18, 2], [24, 6], [31, 2]]} id={id + 'eyes'} ink="#2a1d18" sw={3.2} />
    ) : (
      <ellipse cx={25} cy={0} rx={4.6} ry={6.6} fill="#2a1d18" />
    )}
    <ellipse cx={30} cy={18} rx={8} ry={5} fill="#ff8f8f" opacity={0.55} />
    <Ln p={[[16, 22], [23, 27], [32, 24]]} id={id + 'm'} ink="#7a3326" sw={2.6} />
  </g>
);

/* ───── 交通車（原點＝車身左下輪胎著地處，車頭朝右） ───── */
const BUS_Y = '#ffc83a';
export const BUS_W = 720;
const WIN = (i: number) => 40 + i * 100;

/** 車內（畫在主角後面）：門口與車窗後的暗色車廂＋窗邊乘客 */
export const BusBack: React.FC<{rider: boolean; wave: number | null}> = ({rider, wave}) => (
  <g>
    <rect x={30} y={-310} width={600} height={100} fill="#5b6f86" />
    <rect x={556} y={-306} width={88} height={250} fill="#4c5d72" />
    {rider ? (
      <g transform={`translate(${WIN(4) + 40} ${-232}) scale(0.62)`}>
        <Head id="busk" />
        {wave !== null ? <g transform={`rotate(${-150 + wave * 25} 26 40)`}><Ln p={[[26, 40], [26, 96]]} id="bwave" ink="#ffd6b5" sw={11} /></g> : null}
      </g>
    ) : null}
  </g>
);

/** 車身（畫在主角前面）；門開時車門是空的，看得到車內的人 */
export const BusFront: React.FC<{door: number; wheel: number; dust: number; label: string}> = ({door, wheel, dust, label}) => {
  const body: Pt[] = [[0, -320], [660, -320], [712, -290], [720, -60], [0, -60]];
  return (
    <g>
      {/* 排氣小雲 */}
      {dust > 0
        ? [0, 1, 2].map((i) => {
            const t = (G.f * 0.07 + i / 3) % 1;
            return <Sh key={i} p={ell(-20 - t * 120, -70 - t * 40, 14 + t * 22, 11 + t * 16, 12)} fill="#e9e4dc" ink="#9a928a" id={'puff' + i} sw={2} op={(1 - t) * dust} hatch={0} />;
          })
        : null}
      <path
        d={
          'M0,-320L660,-320L712,-290L720,-60L0,-60Z' +
          [0, 1, 2, 3, 4].map((i) => `M${WIN(i)},-302L${WIN(i) + 84},-302L${WIN(i) + 84},-214L${WIN(i)},-214Z`).join('') +
          (door > 0 ? 'M556,-306L644,-306L644,-62L556,-62Z' : '')
        }
        fill={BUS_Y}
        fillRule="evenodd"
      />
      <Sh p={body} ink={INK} id="busbody" sw={3.4} hatch={0} />
      {/* 筆觸只畫在車身下半部，車窗區保持乾淨 */}
      <rect x={0} y={-200} width={720} height={140} fill="url(#h13)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <Sh p={rect(WIN(i), -302, 84, 88)} fill="#cfeaf5" ink={INK} id={'bw' + i} sw={2.6} op={0.42} hatch={0} />
          <Sh p={rect(WIN(i), -302, 84, 88)} ink={INK} id={'bwo' + i} sw={2.6} />
          <Ln p={[[WIN(i) + 14, -290], [WIN(i) + 40, -264]]} id={'bwr' + i} ink="#ffffff" sw={4} op={0.8} />
        </g>
      ))}
      <Sh p={[[662, -300], [704, -282], [708, -190], [662, -190]]} fill="#cfeaf5" ink={INK} id="bwind" sw={2.6} op={0.85} hatch={0} />
      {/* 車門：門片收到兩側 */}
      <Sh p={rect(556, -306, 88, 244)} ink={INK} id="bdoor" sw={2.6} />
      {door < 1 ? (
        <g>
          <Sh p={rect(556, -306, 44 * (1 - door), 244)} fill="#f1b72c" ink={INK} id="bdl" sw={2.2} />
          <Sh p={rect(644 - 44 * (1 - door), -306, 44 * (1 - door), 244)} fill="#f1b72c" ink={INK} id="bdr" sw={2.2} />
        </g>
      ) : null}
      <Sh p={rect(0, -132, 720, 20)} fill="#e7553a" ink={INK} id="bstripe" sw={2} hatch={0} />
      {label ? <Tx x={34} y={-152} s={52} c="#2d3a6b" a="start">{label}</Tx> : null}
      <Sh p={ell(706, -110, 12, 14, 10)} fill="#fff6c8" ink={INK} id="blight" sw={2.2} hatch={0} />
      {/* 輪子 */}
      {[150, 590].map((x, i) => (
        <g key={x}>
          <Sh p={ell(x, -46, 58, 58, 18, Math.PI, Math.PI * 2)} fill="#8a6a2a" ink={INK} id={'arch' + i} sw={2.4} hatch={0} />
          <Sh p={ell(x, -46, 46, 46, 18)} fill="#3c3a44" ink="#221f26" id={'tire' + i} sw={3} hatch={0} />
          <Sh p={ell(x, -46, 22, 22, 12)} fill="#d9d4cc" ink={INK} id={'hub' + i} sw={2.2} hatch={0} />
          {[0, 1, 2].map((s) => {
            const a = wheel + (s * Math.PI * 2) / 3;
            return <line key={s} x1={x} y1={-46} x2={x + Math.cos(a) * 20} y2={-46 + Math.sin(a) * 20} stroke="#6f6a66" strokeWidth={4} strokeLinecap="round" />;
          })}
        </g>
      ))}
    </g>
  );
};
