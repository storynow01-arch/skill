/* 滾輪式數字：數字從 0 往上數到目標值，每一位數換數字時舊的往上滑出淡出、新的從下滑入淡入（連續，不是一格硬切）。
   為什麼不用逐格換字：大字每跳一個數字就是「一格之內大面積改變」，最終品檢 F11 會判成畫面突跳；
   滾輪是連續移動，加上前快後慢（ease-out），保留往上數的特效又不會被誤判。
   用法：<RollNum text="26162" p={進度0→1} />，外層的 span 負責字型、描邊、顏色（會繼承到每一位）。
   非數字（例如「3.4萬」裡的「萬」、「80%」的 %）照原樣顯示；只有整數或小數會滾動。 */
import React from 'react';
import {Easing, interpolate} from 'remotion';

/** 往上數的進度：前快後慢，dur 格內完成 */
export const rollProgress = (f: number, at: number, dur = 36) =>
  interpolate(f - at, [0, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/** 一位滾輪：off＝0～10（連續），每格高 h（em）。
    滾動中的數字條標 data-qa="ignore"（被遮住的上下數字不算版面）；停住時只畫一個數字，照常量版面。 */
const Wheel: React.FC<{off: number; h: number; w: number; opacity?: number}> = ({off, h, w, opacity = 1}) => {
  const rest = Math.abs(off - Math.round(off)) < 0.002;
  const cell: React.CSSProperties = {position: 'absolute', left: 0, right: 0, top: 0, height: `${h}em`, lineHeight: `${h}em`, textAlign: 'center'};
  // 不靠裁切（描邊大字在 rotate／inline 結構裡裁切不可靠）：交接中的兩個數字，舊的往上滑出並淡出、新的從下方滑入並淡入
  const lo = Math.floor(off), fr = off - lo;
  const slide = 0.45;   // 滑動距離（em）
  return (
    <span style={{display: 'inline-block', position: 'relative', width: `${w}em`, height: `${h}em`, verticalAlign: 'bottom', opacity}}>
      {rest ? (
        <span style={cell}>{DIGITS[Math.round(off) % 10]}</span>
      ) : (
        <span data-qa="ignore">
          <span style={{...cell, transform: `translateY(${-fr * slide}em)`, opacity: 1 - fr}}>{DIGITS[lo % 10]}</span>
          <span style={{...cell, transform: `translateY(${(1 - fr) * slide}em)`, opacity: fr}}>{DIGITS[(lo + 1) % 10]}</span>
        </span>
      )}
    </span>
  );
};

/** text＝目標值字串；p＝0→1；digitW＝每位寬（em，依字型調）；h＝窗口高（em，貼合字形高度：太高會同時看到上下兩個數字） */
export const RollNum: React.FC<{text: string; p: number; digitW?: number; h?: number}> = ({text, p, digitW = 0.58, h = 0.95}) => {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!m) return <>{text}</>;
  const intS = m[1], frac = m[2] ?? '';
  const all = intS + frac;
  const target = parseInt(all, 10);
  const x = target * Math.max(0, p);
  const n = all.length;
  const cols = Array.from({length: n}, (_, k) => {
    const i = n - 1 - k;              // 這一位是 10^i
    const pw = Math.pow(10, i);
    let off: number;
    if (i === 0) off = x % 10;
    else {
      const carry = Math.min(1, Math.max(0, (x % pw) - (pw - 1)));   // 下一位從 9 滾到 0 時才帶動這一位
      off = (Math.floor(x / pw) + carry) % 10;
    }
    // 整數部分的前導位：數到那一位之前先淡淡隱藏（避免顯示 0026）；寬度不變，版面不跳
    const lead = k < intS.length - 1 ? Math.min(1, Math.max(0, x - pw + 1)) : 1;
    return {off, lead, key: k};
  });
  return (
    <span style={{display: 'inline-flex', alignItems: 'flex-end', whiteSpace: 'nowrap'}}>
      {cols.map((c, k) => (
        <React.Fragment key={c.key}>
          {frac && k === intS.length ? <span>.</span> : null}
          <Wheel off={c.off} h={h} w={digitW} opacity={c.lead} />
        </React.Fragment>
      ))}
    </span>
  );
};
