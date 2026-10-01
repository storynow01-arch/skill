/* 教學通用場景（對應 01教學影片AI製作 產線的場景型別）：
   scenario / definition / quiz / vs / recap / qaEnd —— 全部只用 theme token。 */
import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ease, easeIO, glowOf, useTheme} from './theme';
import {Heading, abs, panelStyle} from './kit';
import {SceneProps, cue} from './scenes';

const EMOJI = '"Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif';
const mapCue = (cues: number[], map: number[] | undefined, i: number, fb: number) =>
  map && map[i] !== undefined && map[i] >= 0 ? cue(cues, map[i], fb) : fb;

/* ---------- 情境卡：大圖示 + 膠囊標籤 ---------- */
export const Scenario: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 4, fps, config: {damping: 12}});
  const pills: string[] = p.pills ?? [];
  const cols = [t.c.accent, t.c.accent2, t.c.bad];
  return (
    <AbsoluteFill>
      <Heading zh={p.heading} en={p.en} accent={accent} />
      <div style={abs({left: 260, top: 360, width: 440, height: 440, borderRadius: '50%', ...panelStyle(t, accent, true),
        transform: `scale(${s * (1 + 0.03 * Math.sin(f / 9))})`, display: 'flex', alignItems: 'center', justifyContent: 'center'})}>
        <span style={{fontFamily: EMOJI, fontSize: 220, transform: p.spin ? `rotate(${f * 6}deg)` : undefined}}>{p.icon}</span>
      </div>
      <div style={abs({left: 820, top: 390, display: 'flex', flexDirection: 'column', gap: 34})}>
        {pills.map((x, i) => {
          const a = ease(f, mapCue(cues, p.cueMap, i, 16 + i * 26), 12);
          const last = i === pills.length - 1;
          return (
            <div key={x} style={{opacity: 0.15 + 0.85 * a, transform: `translateX(${(1 - a) * 60}px)`, display: 'flex', alignItems: 'center', gap: 24}}>
              <div style={{width: 18, height: 18, borderRadius: 9, background: cols[i % 3], boxShadow: glowOf(t, cols[i % 3], 0.6)}} />
              <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: last ? 64 : 54, color: last ? t.c.bad : t.c.fg,
                padding: '10px 34px', borderRadius: t.radius ? 50 : 0, border: `3px solid ${cols[i % 3]}`, background: `${cols[i % 3]}18`}}>{x}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 定義卡：關鍵句 + 高亮 + 註解卡 ---------- */
export const Definition: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const big: string = p.bigText;
  const hl: string = p.highlight ?? '';
  const k = hl ? big.indexOf(hl) : -1;
  const a = ease(f, mapCue(cues, p.cueMap, 0, 8), 16);
  const hlA = easeIO(f, mapCue(cues, p.cueMap, 1, 30), 16);
  const notes: string[] = p.sideNotes ?? [];
  return (
    <AbsoluteFill>
      <div style={abs({left: 0, right: 0, top: 200, display: 'flex', justifyContent: 'center', opacity: ease(f, 2, 12)})}>
        <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 36, letterSpacing: 8, color: accent, padding: '10px 40px',
          border: `2px solid ${accent}`, borderRadius: t.radius ? 40 : 0}}>{p.label}</div>
      </div>
      <div style={abs({left: 0, right: 0, top: 340, textAlign: 'center', opacity: a, transform: `scale(${1.08 - 0.08 * a})`,
        fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 124, color: t.c.fg, textShadow: glowOf(t, accent, 0.7)})}>
        {k < 0 ? big : (
          <>
            {big.slice(0, k)}
            <span style={{position: 'relative', color: hlA > 0.5 ? t.c.accent2 : t.c.fg}}>
              {hl}
              <span style={{position: 'absolute', left: 0, bottom: -10, height: 12, width: `${hlA * 100}%`, background: t.c.accent2,
                borderRadius: 6, boxShadow: glowOf(t, t.c.accent2, 0.6)}} />
            </span>
            {big.slice(k + hl.length)}
          </>
        )}
      </div>
      <div style={abs({left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', gap: 40})}>
        {notes.map((n, i) => {
          const na = ease(f, mapCue(cues, p.noteCues, i, 50 + i * 14), 12);
          return <div key={n} style={{width: 400, padding: '28px 0', textAlign: 'center', ...panelStyle(t, [t.c.accent, t.c.accent3, t.c.ok][i % 3], na > 0.9),
            opacity: 0.2 + 0.8 * na, transform: `translateY(${(1 - na) * 30}px)`, fontFamily: t.f.tc, fontWeight: 700, fontSize: 40, color: t.c.fg}}>{n}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 課中測驗：選項 → 揭曉 ---------- */
export const Quiz: React.FC<SceneProps> = ({p, cues, dur, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = p.revealCue !== undefined ? cue(cues, p.revealCue, dur * 0.6) : Math.round((p.revealAt ?? dur / fps * 0.6) * fps);
  const opts: string[] = p.options;
  const r = ease(f, reveal, 10);
  const think = Math.max(0, Math.min(1, (f - cue(cues, 1, 20)) / Math.max(1, reveal - cue(cues, 1, 20))));
  return (
    <AbsoluteFill>
      <div style={abs({left: 140, top: 150, fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 18 : 30, letterSpacing: 8, color: accent})}>QUICK CHECK</div>
      <div style={abs({left: 140, top: 210, fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 82, color: t.c.fg, opacity: ease(f, 2, 14), textShadow: glowOf(t, accent, 0.4)})}>{p.question}</div>
      <div style={abs({left: 140, right: 140, top: 420, display: 'flex', gap: 50})}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          const col = r > 0.5 ? (ok ? t.c.ok : t.c.muted) : [t.c.accent, t.c.accent2, t.c.accent3, t.c.bad][i % 4];
          const a = ease(f, 10 + i * 8, 12);
          return (
            <div key={o} style={{flex: 1, height: 260, ...panelStyle(t, col, r > 0.5 && ok), opacity: a * (r > 0.5 && !ok ? 0.35 : 1),
              transform: `scale(${r > 0.5 && ok ? 1 + 0.05 * r : 1})`, display: 'flex', alignItems: 'center', gap: 36, padding: '0 50px'}}>
              <div style={{width: 110, height: 110, flex: '0 0 110px', borderRadius: t.radius ? 55 : 0, border: `4px solid ${col}`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontFamily: t.f.num, fontWeight: t.w.num, fontSize: t.f.num.includes('Press') ? 34 : 60, color: col}}>
                {r > 0.5 ? (ok ? '✓' : '✕') : String.fromCharCode(65 + i)}
              </div>
              <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 60, color: t.c.fg}}>{o}</div>
            </div>
          );
        })}
      </div>
      {/* 思考計時條 */}
      <div style={abs({left: 140, right: 140, top: 730, height: 10, background: `${t.c.muted}33`, borderRadius: 5, opacity: 1 - r})}>
        <div style={{width: `${think * 100}%`, height: '100%', background: accent, borderRadius: 5}} />
      </div>
      {p.afterNote && <div style={abs({left: 0, right: 0, top: 790, textAlign: 'center', opacity: ease(f, reveal + 20, 14),
        fontFamily: t.f.tc, fontWeight: 700, fontSize: 42, color: t.c.accent2})}>{p.afterNote}</div>}
    </AbsoluteFill>
  );
};

/* ---------- 左右對照（圖示 + 句子） ---------- */
export const Vs: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const colOf = (fr: string) => (fr === 'danger' ? t.c.bad : fr === 'success' ? t.c.ok : accent);
  const side = (s: {frame: string; icon: string; text: string}, i: number) => {
    const col = colOf(s.frame);
    const a = ease(f, mapCue(cues, p.cueMap, i, i ? 40 : 6), 14);
    return (
      <div style={{width: 700, height: 460, ...panelStyle(t, col, true), opacity: 0.15 + 0.85 * a, transform: `translateY(${(1 - a) * 40}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 50px', textAlign: 'center'}}>
        <div style={{fontFamily: EMOJI, fontSize: 130, color: col, lineHeight: 1.1}}>{s.icon}</div>
        <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 50, color: t.c.fg, marginTop: 30, lineHeight: 1.4}}>{s.text}</div>
      </div>
    );
  };
  const last = cues.length ? cues[cues.length - 1] : 90;
  return (
    <AbsoluteFill>
      {p.heading && <Heading zh={p.heading} en={p.en} accent={accent} top={130} center />}
      <div style={abs({left: 0, right: 0, top: p.heading ? 330 : 250, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 60})}>
        {side(p.left, 0)}
        <div style={{fontFamily: t.f.num, fontWeight: t.w.num, fontSize: 110, color: t.c.muted}}>{p.mid}</div>
        {side(p.right, 1)}
      </div>
      {p.footerPill && (
        <div style={abs({left: 0, right: 0, top: p.heading ? 840 : 780, display: 'flex', justifyContent: 'center', opacity: ease(f, mapCue(cues, p.footerCue !== undefined ? [p.footerCue] : undefined, 0, last), 14)})}>
          <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 40, color: t.c.fg, padding: '12px 44px', borderRadius: t.radius ? 50 : 0,
            border: `3px solid ${t.c.accent2}`, background: `${t.c.accent2}22`}}>{p.footerPill}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ---------- 結語卡：帶走的句子 + 重點回顧 + 下一節 ---------- */
export const Recap: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const take: string[] = p.takeaway ?? [];
  const recap: string[] = p.recap ?? [];
  return (
    <AbsoluteFill>
      <div style={abs({left: 140, top: 170, fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 18 : 30, letterSpacing: 8, color: accent})}>TAKEAWAY</div>
      <div style={abs({left: 140, top: 240, width: 1000, display: 'flex', flexDirection: 'column', gap: 40})}>
        {take.map((s, i) => {
          const a = ease(f, mapCue(cues, p.takeCues, i, 10 + i * 40), 14);
          return <div key={s} style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 60, lineHeight: 1.35, color: t.c.fg, opacity: 0.15 + 0.85 * a,
            borderLeft: `10px solid ${[accent, t.c.accent2][i % 2]}`, paddingLeft: 34, textShadow: glowOf(t, accent, 0.3)}}>{s}</div>;
        })}
      </div>
      <div style={abs({left: 1220, top: 230, width: 560, padding: '34px 40px', ...panelStyle(t, t.c.accent3), opacity: ease(f, 20, 14)})}>
        <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 32, color: t.c.accent3, marginBottom: 18}}>重點回顧</div>
        {recap.map((s, i) => (
          <div key={s} style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 32, color: t.c.fg, marginTop: 16, opacity: ease(f, 26 + i * 8, 10)}}>
            <span style={{color: t.c.ok, marginRight: 14}}>✓</span>{s}
          </div>
        ))}
      </div>
      {p.nextTeaser && (
        <div style={abs({left: 140, top: 790, opacity: ease(f, mapCue(cues, p.nextCue !== undefined ? [p.nextCue] : undefined, 0, 120), 14),
          display: 'flex', alignItems: 'center', gap: 26})}>
          <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 16 : 28, letterSpacing: 6, color: t.c.muted}}>NEXT ▶</div>
          <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 50, color: t.c.accent2, textShadow: glowOf(t, t.c.accent2, 0.5)}}>下一節：{p.nextTeaser}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ---------- 片尾測驗（無旁白、固定秒數） ---------- */
export const QaEnd: React.FC<SceneProps> = ({p, dur, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ans = Math.round((p.answerSec ?? 4) * fps);
  const r = ease(f, ans, 8);
  const opts: string[] = p.options;
  return (
    <AbsoluteFill>
      <div style={abs({left: 140, top: 140, fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 18 : 30, letterSpacing: 8, color: accent})}>
        FINAL QUIZ · {Math.max(0, Math.ceil((ans - f) / fps))}
      </div>
      <div style={abs({left: 140, top: 200, fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 66, color: t.c.fg})}>{p.question}</div>
      <div style={abs({left: 140, right: 140, top: 380, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 34})}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          const col = r > 0.5 ? (ok ? t.c.ok : t.c.muted) : accent;
          return (
            <div key={o} style={{height: 170, ...panelStyle(t, col, r > 0.5 && ok), opacity: ease(f, 4 + i * 4, 10) * (r > 0.5 && !ok ? 0.35 : 1),
              display: 'flex', alignItems: 'center', gap: 30, padding: '0 40px'}}>
              <div style={{fontFamily: t.f.num, fontWeight: t.w.num, fontSize: t.f.num.includes('Press') ? 30 : 54, color: col, width: 70}}>{r > 0.5 && ok ? '✓' : String.fromCharCode(65 + i)}</div>
              <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 44, color: t.c.fg}}>{o}</div>
            </div>
          );
        })}
      </div>
      <div style={abs({left: 140, right: 140, top: 800, height: 10, background: `${t.c.muted}33`, borderRadius: 5})}>
        <div style={{width: `${Math.min(1, f / ans) * 100}%`, height: '100%', background: r > 0.5 ? t.c.ok : accent, borderRadius: 5}} />
      </div>
      {dur < 0 && null}
    </AbsoluteFill>
  );
};

export const LESSON: Record<string, React.FC<SceneProps>> = {scenario: Scenario, definition: Definition, quiz: Quiz, vs: Vs, recap: Recap, qaEnd: QaEnd};
