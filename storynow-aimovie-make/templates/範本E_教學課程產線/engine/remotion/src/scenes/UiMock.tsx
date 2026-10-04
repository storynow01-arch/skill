import {useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring} from 'remotion';
import {C, T, FONT, MONO, R, L} from '../theme';
import {rise} from '../anim';
import {FocusPlan, focusFrom, focusPulse, schedule, beatAt, pulse} from '../beats';

/**
 * 模擬螢幕操作 —— 不需要真的錄螢幕。
 *
 * 用途：單元四要教 AWS / Azure 主控台，但我們不做真實螢幕錄影。
 * 這個組件用程式畫出一個瀏覽器視窗，裡面放可自訂的介面骨架，
 * 再依旁白時間點驅動游標移動、點擊漣漪、輸入文字、區塊高亮。
 *
 * 觀眾看到的是「有人在操作」，而不是一張靜態截圖配旁白。
 * 而且它永遠不會過期 —— 真實主控台改版不影響這支片。
 *
 * 動態天然達標：游標逐幀移動，本質上不可能靜止。
 */

export type UiStep = {
  /** 旁白講到這句時執行這一步 */
  cue?: string;
  /** 游標要移到哪（畫面比例 0–1） */
  to?: [number, number];
  /** 動作 */
  action?: 'move' | 'click' | 'type' | 'highlight';
  /** type 時要打的字；highlight 時的說明標籤 */
  text?: string;
  /** highlight 的方框（比例 0–1）：[x, y, w, h] */
  box?: [number, number, number, number];
};

export type UiPanel = {
  /** 左側選單項目 */
  nav?: string[];
  /** 主區塊的列（模擬清單、表格） */
  rows?: {label: string; value?: string; tag?: string}[];
  /** 右上角按鈕 */
  action?: string;
};

const CHROME_H = 52;

export const UiMock: React.FC<{
  heading?: string;
  url?: string;
  title?: string;
  panel?: UiPanel;
  steps?: UiStep[];
  focusPlan?: FocusPlan;
  durSec?: number;
}> = ({heading, url = 'console.aws.amazon.com', title = 'Console',
       panel = {}, steps = [], focusPlan, durSec = 20}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  const beats = schedule(durSec);
  // 沒有 focusPlan 時依節拍「走一輪就停在最後一步」，不循環（2026-10-03）
  const active = focusPlan ? focusFrom(t, focusPlan)
    : Math.min(beatAt(t, beats), Math.max(steps.length, 1) - 1);
  const p = focusPlan ? focusPulse(t, focusPlan) : pulse(t, beats);

  // 視窗尺寸
  const W = 1480, H = 700;
  const X = (1920 - W) / 2, Y = 210;

  // 游標：在前一步與當前步之間平滑移動
  const cur = steps[Math.max(active, 0)] ?? {};
  const prev = steps[Math.max(active - 1, 0)] ?? cur;
  const ease = focusPlan ? Math.min(1, p > 0 ? 1 - p : 1) : 1;
  const from = prev.to ?? [0.5, 0.5];
  const to = cur.to ?? from;
  const cx = X + W * (from[0] + (to[0] - from[0]) * ease);
  const cy = Y + CHROME_H + (H - CHROME_H) * (from[1] + (to[1] - from[1]) * ease);

  // 點擊漣漪
  const clicking = cur.action === 'click' && p > 0.05;
  const ripple = clicking ? (1 - p) * 46 : 0;

  // 打字：依脈衝進度逐字顯示
  const typed = cur.action === 'type' && cur.text
    ? cur.text.slice(0, Math.ceil(cur.text.length * Math.min(1, (1 - p) * 1.4)))
    : '';

  const box = cur.action === 'highlight' ? cur.box : undefined;
  const enter = spring({frame: f, fps, config: {damping: 18, stiffness: 140}});

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', fontFamily: FONT}}>
      {heading && (
        <div style={{...rise(f, fps, 0), color: C.text, fontSize: T.h2,
                     fontWeight: 700, marginTop: 92}}>
          {heading}
        </div>
      )}

      <div style={{
        position: 'absolute', left: X, top: Y, width: W, height: H,
        opacity: enter, transform: `translateY(${(1 - enter) * 22}px)`,
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: R.lg, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
      }}>
        {/* 視窗列 */}
        <div style={{height: CHROME_H, background: C.high, display: 'flex',
                     alignItems: 'center', gap: 10, padding: '0 20px',
                     borderBottom: `1px solid ${C.border}`}}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <div key={c} style={{width: 13, height: 13, borderRadius: '50%', background: c}} />
          ))}
          <div style={{flex: 1, margin: '0 18px', height: 30, borderRadius: R.pill,
                       background: C.bg, border: `1px solid ${C.border}`,
                       display: 'flex', alignItems: 'center', padding: '0 16px',
                       color: C.muted, fontSize: 20, fontFamily: MONO}}>
            {url}
          </div>
          <div style={{color: C.muted, fontSize: 20}}>{title}</div>
        </div>

        <div style={{display: 'flex', height: H - CHROME_H}}>
          {/* 左側選單 */}
          {panel.nav && (
            <div style={{width: 280, borderRight: `1px solid ${C.border}`,
                         padding: '24px 0', background: C.bg}}>
              {panel.nav.map((n, i) => (
                <div key={i} style={{padding: '15px 26px', color: C.body, fontSize: 24,
                                     borderLeft: `3px solid transparent`}}>
                  {n}
                </div>
              ))}
            </div>
          )}

          {/* 主區塊 */}
          <div style={{flex: 1, padding: '28px 34px'}}>
            {panel.action && (
              <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 24}}>
                <div style={{background: C.primary, color: C.bg, fontWeight: 700,
                             fontSize: 22, borderRadius: R.sm, padding: '12px 26px'}}>
                  {panel.action}
                </div>
              </div>
            )}
            {(panel.rows ?? []).map((r, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20,
                                   padding: '18px 22px', marginBottom: 12,
                                   background: C.card, borderRadius: R.sm,
                                   border: `1px solid ${C.border}`}}>
                <div style={{flex: 1, color: C.text, fontSize: 24}}>{r.label}</div>
                {r.value && <div style={{color: C.muted, fontSize: 22, fontFamily: MONO}}>{r.value}</div>}
                {r.tag && (
                  <div style={{color: C.success, fontSize: 19, border: `1px solid ${C.success}`,
                               borderRadius: R.pill, padding: '5px 14px'}}>{r.tag}</div>
                )}
              </div>
            ))}
            {typed && (
              <div style={{marginTop: 18, padding: '16px 20px', background: C.bg,
                           border: `1px solid ${C.primary}`, borderRadius: R.sm,
                           color: C.text, fontSize: 24, fontFamily: MONO}}>
                {typed}<span style={{opacity: Math.round(t * 2) % 2 ? 1 : 0}}>▍</span>
              </div>
            )}
          </div>
        </div>

        {/* 重點方框 */}
        {box && (
          <div style={{position: 'absolute',
                       left: box[0] * W, top: CHROME_H + box[1] * (H - CHROME_H),
                       width: box[2] * W, height: box[3] * (H - CHROME_H),
                       border: `2px solid ${C.primary}`, borderRadius: R.sm,
                       boxShadow: `0 0 ${18 + p * 26}px ${C.glow}`}} />
        )}
      </div>

      {/* 游標 */}
      <div style={{position: 'absolute', left: cx, top: cy, pointerEvents: 'none'}}>
        {ripple > 0 && (
          <div style={{position: 'absolute', left: -ripple / 2, top: -ripple / 2,
                       width: ripple, height: ripple, borderRadius: '50%',
                       border: `2px solid ${C.primary}`, opacity: p}} />
        )}
        <svg width="30" height="30" viewBox="0 0 24 24">
          <path d="M5 2 L5 20 L10 15 L13 22 L16 21 L13 14 L19 14 Z"
                fill="#FFFFFF" stroke="#000000" strokeWidth="1.2" />
        </svg>
      </div>

      {cur.action === 'highlight' && cur.text && (
        <div style={{position: 'absolute', top: Y + H + 26, width: '100%',
                     display: 'flex', justifyContent: 'center'}}>
          <div style={{color: C.primary, fontSize: T.h3, fontWeight: 600}}>{cur.text}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
