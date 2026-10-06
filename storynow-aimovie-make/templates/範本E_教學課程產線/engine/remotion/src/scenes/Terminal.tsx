import {useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate} from 'remotion';
import {C, T, FONT, MONO, R} from '../theme';
import {rise} from '../anim';
import {Phrases} from '../Phrases';

/** ③ 終端機打字（特效試作 2026-10-06）：每一行在旁白唸到時出現（lines[i].at 秒），
 *  指令行（cmd）帶提示字元、逐字打出；輸出行快速打出。每行只打一次、打完固定；游標在最後一行閃（面積很小）。 */
export type TermLine = {text: string; at: number; cmd?: boolean; tone?: 'ok' | 'warn' | 'muted'};

export const Terminal: React.FC<{
  heading?: string; prompt?: string; lines: TermLine[]; footer?: string; footerAt?: number; durSec?: number;
}> = ({heading, prompt = 'C:\\> ', lines, footer, footerAt, durSec = 12}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const typed = (s: string, at: number, cps: number) => s.slice(0, Math.max(0, Math.floor((t - at) * cps)));
  const shown = lines.filter((l) => t >= l.at);
  const color = (l: TermLine) => l.cmd ? C.primary : l.tone === 'ok' ? C.success : l.tone === 'warn' ? C.primary
    : l.tone === 'muted' ? C.muted : C.body;
  const fAt = footerAt ?? durSec - 4;
  const blink = Math.floor(t * 2) % 2 === 0;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT}}>
      {heading && <div style={{...rise(f, fps, 0), color: C.text, fontSize: T.h2, fontWeight: 700, marginBottom: 36}}>
        <Phrases text={heading} /></div>}
      <div style={{...rise(f, fps, 0.2), width: 1380, height: 500, background: '#0d0d0d', border: `1px solid ${C.border}`,
                   borderRadius: R.lg, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)'}}>
        <div style={{height: 44, background: C.high, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px'}}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{width: 12, height: 12, borderRadius: '50%', background: c}} />)}
          <div style={{color: C.muted, fontSize: 24, marginLeft: 16}}>命令提示字元</div>
        </div>
        <div data-qa-mono="1" style={{padding: '20px 30px', fontFamily: MONO, fontSize: 26, lineHeight: 1.5, whiteSpace: 'pre'}}>
          {shown.map((l, i) => (
            <div key={i} style={{color: color(l), opacity: interpolate(t, [l.at, l.at + 0.2], [0, 1], {extrapolateRight: 'clamp'})}}>
              {l.cmd && <span style={{color: C.text}}>{prompt}</span>}
              {typed(l.text, l.at, l.cmd ? 16 : 70)}
              {i === shown.length - 1 && blink && <span style={{color: C.muted}}>▍</span>}
            </div>
          ))}
        </div>
      </div>
      {footer && <div style={{...rise(f, fps, fAt), color: C.body, fontSize: T.h3, marginTop: 30}}><Phrases text={footer} /></div>}
    </AbsoluteFill>
  );
};
