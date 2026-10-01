/* 風格型錄：第 i 格 = 第 i 種風格的代表畫面（Freeze 在動畫完成後），給使用者挑風格用。
   npx remotion render src/index.ts Gallery out/gallery_%02d.png --sequence   */
import React, {useMemo} from 'react';
import {AbsoluteFill, Freeze, useCurrentFrame} from 'remotion';
import {Background, Finish} from './backgrounds';
import {Chip, CodeWindow, Counter, Hud, abs, panelStyle} from './kit';
import {STYLE_IDS, ThemeProvider, glowOf, makeTheme} from './theme';
import STYLES from './styles.json';

export const GALLERY_FRAMES = STYLE_IDS.length;

const Sample: React.FC<{id: string; idx: number}> = ({id, idx}) => {
  const t = useMemo(() => makeTheme(id), [id]);
  const s = (STYLES as Record<string, {name: string; desc: string; music: {genre: string; bpm: number}}>)[id];
  const c = t.c;
  return (
    <ThemeProvider theme={t}>
      <AbsoluteFill style={{background: c.bg}}>
        <Background t={t} accent={c.accent} code={0.6} />
        <Freeze frame={90}>
          <div style={abs({left: 140, top: t.letterbox ? 190 : 150})}>
            <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 18 : 28, letterSpacing: 8, color: c.accent}}>
              STYLE {String(idx + 1).padStart(2, '0')} · {id.toUpperCase()}
            </div>
            <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 120, color: c.fg, textShadow: glowOf(t, c.accent, 1.2), marginTop: 10}}>{s.name}</div>
            <div style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 32, color: c.muted, marginTop: 6, maxWidth: 1000}}>{s.desc}</div>
          </div>
          <div style={abs({left: 140, top: 560, display: 'flex', alignItems: 'flex-end', gap: 16})}>
            <Counter to={34} suffix="%" size={t.f.num.includes('Press') ? 110 : 170} color={c.accent} delay={0} dur={1} />
            <span style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 44, color: c.fg, marginBottom: 12}}>錄取率</span>
          </div>
          <div style={abs({left: 140, top: 800, display: 'flex', gap: 18})}>
            <Chip text="封包" color={c.accent} /><Chip text="IP 位址" color={c.accent2} /><Chip text="路由" color={c.accent3} />
          </div>
          <div style={abs({left: 1170, top: 450, width: 620, padding: '30px 36px', ...panelStyle(t, c.accent2, true)})}>
            <div style={{fontFamily: t.f.num, fontWeight: t.w.num, fontSize: t.f.num.includes('Press') ? 26 : 48, color: c.accent2}}>192.168.0.1</div>
            <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 34, color: c.fg, marginTop: 10}}>網路世界的門牌</div>
            <div style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 26, color: c.muted, marginTop: 8}}>四段數字 · 每段 0–255</div>
          </div>
          <CodeWindow title="packet.py" accent={c.accent} start={0} cpf={99} fontSize={21}
            lines={['pkt = IP(dst="192.168.0.1")', 'pkt /= TCP(dport=80)', 'send(pkt)']} style={{left: 1170, top: 700, width: 620}} />
          <div style={abs({right: 80, top: t.letterbox ? 190 : 150, fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 14 : 24,
            color: c.muted, textAlign: 'right', letterSpacing: 2})}>♪ {s.music.genre.toUpperCase()} · {s.music.bpm} BPM</div>
        </Freeze>
        <Hud left="CODE VIDEO STUDIO" right={id.toUpperCase()} accent={c.accent} frame={idx + 1} total={GALLERY_FRAMES} />
        <Finish t={t} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};

export const Gallery: React.FC = () => {
  const f = useCurrentFrame();
  const id = STYLE_IDS[f % STYLE_IDS.length];
  return <Sample id={id} idx={f % STYLE_IDS.length} />;
};
