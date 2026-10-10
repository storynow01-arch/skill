/* 廣R 章型（一）：boot 開機自檢／whoami ASCII 大字＋資訊／ls 清單／tmux 四窗格（原作第 1～4 章）。
   每章的字、每一行在第幾拍出現，全部讀 timeline.json 的章資料 c（timeline.py 依 storyboard 排好）；b(n)＝章內第 n 拍的格數。 */
import React from 'react';
import {interpolate} from 'remotion';
import {B, Chap, EI, EO, LAB, LIN, b, clamp, k, lerp} from './kit';
import {Ascii, Bar, C, Cmd, Cursor, D, IN, KAI, KaiScan, LH, MONO, Stack, abs, base, slideIn, typed} from './ui';

type P = {t: number; c: Chap};
const OK = () => (
  <span>
    <span style={{color: C.w}}>[ </span>
    <span style={{color: C.g, fontWeight: 700}}>{LAB.ok}</span>
    <span style={{color: C.w}}> ]</span>
  </span>
);

/* ───── boot：BIOS 自檢快速捲動 → ./主機 --start → 載入進度條 → ASCII 大字掃描 → 副標逐字 → 全名滑入 ───── */
export const ChBoot: React.FC<P> = ({t, c}) => {
  if (t < b(c.P)) {
    const lines: {l: React.ReactNode; r?: React.ReactNode}[] = [
      {l: <span style={{color: C.g, fontWeight: 700}}>{c.head}</span>},
      ...(c.bios as {text: string; status: string}[]).map((x) => ({l: <span style={{fontFamily: KAI}}>{x.text}</span>, r: <span style={{color: C.g}}>{x.status}</span>})),
      {l: <span style={{color: C.a}}>{c.login}</span>},
    ];
    const items = lines.map((x, i) => ({
      at: i * 3.6,
      h: 46,
      el: (
        <div style={{fontSize: 30}}>
          {x.l}
          {x.r && <span style={{...abs, left: 1180, top: 0}}>{x.r}</span>}
        </div>
      ),
    }));
    const shown = lines.filter((_, i) => t >= i * 3.6).length;
    return (
      <div style={base}>
        <Stack t={t} items={items} maxH={720} style={{left: 44, top: 28, width: 1500}} />
        <div style={{...abs, right: 44, top: 34, width: 300, height: 120, border: `2px solid ${C.line}`, padding: '10px 16px', fontSize: 28, color: C.dim, boxSizing: 'border-box'}}>
          {LAB.post}
          <div style={{marginTop: 14}}><Bar p={shown / lines.length} n={12} cw={20} /></div>
        </div>
      </div>
    );
  }
  const A = c.ascii as {text: string; cols: number; cw: number; ch: number} | null;
  const scan = k(t, b(c.A0), b(c.A1), LIN);
  const subY = c.y0 + c.bigH + 24;
  const titleY = subY + (c.sub ? c.subSize * 1.4 + 16 : 0);
  return (
    <div style={base}>
      <Cmd t={t} s={c.cmd} t0={b(c.P + 0.3)} enter={b(c.E)} style={{...abs, left: 44, top: 28}} />
      {t >= b(c.E) && (
        <div style={{...abs, left: 44, top: 28 + LH, lineHeight: `${LH}px`, whiteSpace: 'nowrap'}}>
          <span style={{color: C.dim, fontFamily: KAI}}>{LAB.loadCore} </span>
          <Bar p={k(t, b(c.E), b(c.A0), LIN)} n={24} />
          <span style={{color: t >= b(c.A0) ? C.g : C.w}}> {t >= b(c.A0) ? '100% ✓' : ''}</span>
        </div>
      )}
      {t >= b(c.A0) && (A ? (
        <div style={{...abs, left: (IN.w - A.cols * A.cw) / 2, top: c.y0}}>
          <Ascii word={A.text} cw={A.cw} ch={A.ch} scan={scan} t={t} />
        </div>
      ) : (
        <div style={{...abs, left: 0, width: IN.w, top: c.y0, textAlign: 'center'}}>
          <KaiScan s={c.title} size={c.bigSize} scan={scan} t={t} />
        </div>
      ))}
      {c.sub && t >= b(c.A1 - 0.25) && (
        <div style={{...abs, left: 0, width: IN.w, top: subY, textAlign: 'center', fontSize: c.subSize, lineHeight: 1.3, color: C.c, letterSpacing: '0.06em', whiteSpace: 'pre'}}>
          {typed(c.sub, t, b(c.A1 - 0.25), b(c.S1))}
        </div>
      )}
      {A && t >= b(c.T1) && (
        <div style={{...abs, left: 0, width: IN.w, top: titleY, textAlign: 'center', fontFamily: KAI, fontSize: c.titleSize, fontWeight: 700, color: C.w, whiteSpace: 'nowrap'}}>
          <span style={slideIn(t, b(c.T1), 0)}>{c.title}</span>
        </div>
      )}
    </div>
  );
};

/* ───── whoami：whoami → neofetch（ASCII 名稱＋資訊列＋色塊）→ echo $SLOGAN → 標語大字 ───── */
export const ChWhoami: React.FC<P> = ({t, c}) => {
  const L = 44;
  const A = c.ascii as {text: string; cols: number; cw: number; ch: number} | null;
  const info = c.info as {key: string; value: string; size: number; at: number}[];
  const cols = [C.g, C.w, C.a, C.c, C.g, C.w];
  return (
    <div style={base}>
      <Cmd t={t} s="whoami" t0={b(0.1)} enter={b(c.E1)} style={{...abs, left: 44, top: 24}} />
      {t >= b(c.E1) && <div style={{...abs, left: 44, top: 24 + LH, lineHeight: `${LH}px`, color: C.a, fontWeight: 700}}>{D.user}</div>}
      {t >= b(c.E1 + 0.25) && <Cmd t={t} s="neofetch" t0={b(c.E1 + 0.25)} enter={b(c.E2)} style={{...abs, left: 44, top: 24 + LH * 2}} />}
      {t >= b(c.E2) && (
        <>
          <div style={{...abs, left: 60, top: 200, width: 880, height: 330, display: 'flex', alignItems: 'center'}}>
            {A ? <Ascii word={A.text} cw={A.cw} ch={A.ch} scan={k(t, b(c.E2), b(c.E2 + 1.5), LIN)} t={t} dots={false} />
              : <KaiScan s={c.name} size={c.nameSize} scan={k(t, b(c.E2), b(c.E2 + 1.5), LIN)} t={t} />}
          </div>
          <div style={{...abs, left: 980, top: 180, fontSize: 30}}>
            <div style={{height: L, lineHeight: `${L}px`, ...slideIn(t, b(c.E2)), display: 'block'}}>
              <span style={{color: C.g, fontWeight: 700}}>{D.user}</span>
              <span style={{color: C.w}}>@</span>
              <span style={{color: C.g, fontWeight: 700}}>{D.host}</span>
            </div>
            <div style={{height: L, lineHeight: `${L}px`, color: C.line, ...slideIn(t, b(c.E2)), display: 'block'}}>────────────────────────</div>
            {info.map((r, i) => {
              const at = b(r.at);
              return (
                <div key={i} style={{height: L, lineHeight: `${L}px`, whiteSpace: 'nowrap', opacity: t >= at ? 1 : 0}}>
                  <span style={{...slideIn(t, at)}}>
                    <span style={{color: C.g, fontWeight: 700, fontFamily: KAI}}>{r.key}</span>
                    <span style={{color: C.w, fontFamily: KAI}}>：</span>
                    <span style={{color: cols[i % cols.length], fontFamily: KAI, fontSize: r.size}}>{r.value}</span>
                  </span>
                </div>
              );
            })}
            <div style={{height: L, marginTop: 10, display: 'flex', opacity: t >= b(c.colAt) ? 1 : 0}}>
              {[C.ink, C.r, C.g, C.a, C.c, '#9b8cff', '#5ad1a0', C.w].map((cc, i) => (
                <div key={i} style={{width: 46, height: 34, background: cc, opacity: interpolate(t, [b(c.colAt) + i * 1.5, b(c.colAt) + i * 1.5 + 4], [0, 1], clamp)}} />
              ))}
            </div>
          </div>
        </>
      )}
      {c.slogan && t >= b(c.colAt + 0.5) && <Cmd t={t} s="echo $SLOGAN" t0={b(c.colAt + 0.5)} enter={b(c.E3)} style={{...abs, left: 44, top: 590}} />}
      {c.slogan && t >= b(c.E3) && (
        <div style={{...abs, left: 44, top: 652, fontFamily: KAI, fontWeight: 700, fontSize: c.sloganSize, lineHeight: '140px', color: C.g, whiteSpace: 'nowrap', textShadow: '0 0 24px rgba(61,255,138,0.35)'}}>
          {typed(c.slogan, t, b(c.E3), b(c.S1))}
          <Cursor solid={t < b(c.S1)} />
        </div>
      )}
    </div>
  );
};

/* ───── ls：ls -l 目錄 → 一列列像資料夾滑入 → 統計列 → 反白往下掃 ───── */
export const ChLs: React.FC<P> = ({t, c}) => {
  const RH = c.RH as number;
  const top0 = 24 + LH * 2;
  const items = c.items as {name: string; nameSize: number; tag: string; note: string; noteSize: number; at: number}[];
  const n = items.length;
  const selOn = t >= b(c.selAt);
  const sel = Math.min(n - 1, Math.floor((t - b(c.selAt)) / 3));
  const tagCol = [C.c, C.a, '#c59bff'];
  const ux = 16 + 192 + 30;
  const sx = ux + D.user.length * 19.2 + 30;
  return (
    <div style={base}>
      <Cmd t={t} s={c.cmd} t0={b(0.2)} enter={b(c.E)} style={{...abs, left: 44, top: 24}} />
      {t >= b(c.E) && <div style={{...abs, left: 44, top: 24 + LH, lineHeight: `${LH}px`, color: C.dim}}>{c.total}</div>}
      {items.map((p, i) => {
        const at = b(p.at);
        if (t < at) return null;
        const y = top0 + i * RH;
        const hot = Math.max(0, 1 - (t - at) / 10);
        const isSel = selOn && sel === i;
        return (
          <div key={i} style={{...abs, left: 28, top: y, width: 1816, height: RH, lineHeight: `${RH}px`, whiteSpace: 'nowrap', background: isSel ? 'rgba(61,255,138,0.22)' : `rgba(61,255,138,${0.14 * hot})`}}>
            <div style={{...abs, left: 16, top: 0, ...slideIn(t, at, 60)}}><span style={{color: C.c}}>drwxr-xr-x</span></div>
            <div style={{...abs, left: ux, top: 0, color: C.dim, ...slideIn(t, at, 60)}}>{D.user}</div>
            <div style={{...abs, left: sx, top: 0, color: C.dim, ...slideIn(t, at, 60)}}>4096</div>
            <div style={{...abs, left: c.nameX, top: 0, fontFamily: KAI, fontWeight: 700, fontSize: p.nameSize, color: isSel ? C.g : C.w, ...slideIn(t, at, 60)}}>
              {p.name}<span style={{color: C.g}}>/</span>
            </div>
            {p.tag && <div style={{...abs, left: c.tagX, top: 0, color: tagCol[i % 3], ...slideIn(t, at, 60)}}>{p.tag}</div>}
            {p.note && (
              <div style={{...abs, left: c.noteX, top: 0, color: C.a, fontSize: p.noteSize, ...slideIn(t, at, 80)}}>
                <span style={{color: C.dim}}># </span>{p.note}
              </div>
            )}
          </div>
        );
      })}
      {t >= b(c.sumAt) && (
        <div style={{...abs, left: 44, top: top0 + n * RH + 18, lineHeight: `${LH}px`, whiteSpace: 'nowrap', ...slideIn(t, b(c.sumAt))}}>
          <span style={{color: C.g, fontWeight: 700}}>{c.sum}</span>
          {c.extra && (
            <>
              <span style={{color: C.dim}}>　·　</span>
              <span style={{color: C.w, fontWeight: 700, fontFamily: KAI, fontSize: c.extraSize}}>{c.extra}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ───── tmux：分割線把畫面推成 2～4 格（上一章留在左上被推擠），每格跑一個指令；章末最後一格放大 ───── */
type Pane = {x: number; y: number; w: number; h: number};
const PL = 46;
const PaneBox: React.FC<{r: Pane; label: string; active: boolean; children: React.ReactNode}> = ({r, label, active, children}) => (
  <div style={{...abs, left: r.x, top: r.y, width: r.w, height: r.h, overflow: 'hidden', background: C.bg, border: `2px solid ${active ? C.g : C.line}`, boxSizing: 'border-box'}}>
    <div style={{...abs, left: 22, top: 0, height: 36, lineHeight: '36px', padding: '0 10px', fontSize: 28, background: active ? C.g : C.bar, color: active ? C.ink : C.dim, fontWeight: 700, whiteSpace: 'nowrap', zIndex: 2, fontFamily: MONO}}>{label}</div>
    <div style={{...abs, left: 22, top: 44, fontSize: 30, width: r.w - 44}}>{children}</div>
  </div>
);
const Ln: React.FC<{t: number; at: number; children: React.ReactNode; color?: string; size?: number}> = ({t, at, children, color = C.w, size}) =>
  t >= at ? (
    <div style={{height: PL, lineHeight: `${PL}px`, whiteSpace: 'nowrap', color, position: 'relative', fontSize: size}}>
      <span style={{...slideIn(t, at, 30), position: 'relative'}}>{children}</span>
    </div>
  ) : <div style={{height: PL}} />;

type PaneData = {label: string; cmd: string; style: string; t0: number; E: number; lines: {text: string; size: number; at: number}[];
  barAt: number; star: string; starSize: number; starAt: number};
const PaneBody: React.FC<{t: number; p: PaneData; w: number}> = ({t, p, w}) => {
  const n = p.lines.length;
  return (
    <>
      <Cmd t={t} s={p.cmd} t0={b(p.t0)} enter={b(p.E)} short />
      {p.style === 'tree' && <Ln t={t} at={b(p.E + 0.5)} color={C.c}>{p.label.replace(/^\d+:/, '')}/</Ln>}
      {p.lines.map((x, i) => {
        const at = b(x.at);
        const txt = <span style={{fontFamily: KAI}}>{x.text}</span>;
        if (p.style === 'list') return <Ln key={i} t={t} at={at} size={x.size}><span style={{color: C.g}}>▸ </span>{txt}</Ln>;
        if (p.style === 'tree') return <Ln key={i} t={t} at={at} size={x.size}><span style={{color: C.line}}>{i === n - 1 && !p.star ? '└── ' : '├── '}</span>{txt}</Ln>;
        if (p.style === 'log') return <Ln key={i} t={t} at={at} size={x.size}><OK /> {txt}</Ln>;
        return (
          <Ln key={i} t={t} at={at} size={x.size}>
            <span style={{color: C.dim}}>CC </span>{txt}
            <span style={{...abs, left: w - 70, top: 0, color: C.g}}>✓</span>
          </Ln>
        );
      })}
      {p.style === 'make' && <Ln t={t} at={b(p.barAt)}><Bar p={k(t, b(p.barAt), b(p.barAt + 2), LIN)} n={20} cw={18} /></Ln>}
      {p.style === 'make' ? (
        <Ln t={t} at={b(p.starAt)} color={C.g}>
          <b>{LAB.success}</b>
          {p.star && <span style={{color: C.a, fontFamily: KAI, fontSize: p.starSize}}>　{p.star}</span>}
        </Ln>
      ) : p.star ? (
        <Ln t={t} at={b(p.starAt)} color={C.a} size={p.starSize}>
          {p.style === 'tree' ? <span style={{color: C.line}}>└── </span> : null}★ <span style={{fontFamily: KAI}}>{p.star}</span>
        </Ln>
      ) : null}
    </>
  );
};

export const ChTmux: React.FC<P & {len: number; old: React.ReactNode}> = ({t, c, len, old}) => {
  const panes = c.panes as PaneData[];
  const n = panes.length;
  const PW = c.PW as number, PH = c.PH as number;
  const v = k(t, 0, 9, EO); // 垂直分割（線從右邊推進來）
  const hz = n >= 3 ? k(t, b(1), b(1) + 9, EO) : 0; // 水平分割（線從下面推上來）
  const vx = lerp(IN.w, PW + 2, v);
  const hy = lerp(IN.h, PH + 2, hz);
  const zoom = k(t, len - 11, len, EI); // 章末：最後一格放大到全螢幕
  const R: Pane[] =
    n === 2 ? [{x: 0, y: 0, w: vx - 2, h: IN.h}, {x: vx + 2, y: 0, w: PW, h: IN.h}]
      : n === 3 ? [{x: 0, y: 0, w: vx - 2, h: hy - 2}, {x: vx + 2, y: 0, w: PW, h: hy - 2}, {x: 0, y: hy + 2, w: IN.w, h: PH}]
        : [{x: 0, y: 0, w: vx - 2, h: hy - 2}, {x: vx + 2, y: 0, w: PW, h: hy - 2}, {x: 0, y: hy + 2, w: vx - 2, h: PH}, {x: vx + 2, y: hy + 2, w: PW, h: PH}];
  const Z = R[n - 1];
  R[n - 1] = {x: lerp(Z.x, 0, zoom), y: lerp(Z.y, 0, zoom), w: lerp(Z.w, IN.w, zoom), h: lerp(Z.h, IN.h, zoom)};
  const act = t < b(c.actFrom) ? -1 : t >= len - b(3) ? n - 1 : Math.floor((t - b(c.actFrom)) / B) % n;
  const showOld = t < b(2);
  return (
    <div style={{...base, background: C.line}}>
      {panes.map((p, j) => (
        <PaneBox key={j} r={R[j]} label={p.label} active={act === j}>
          {j === 0 && showOld ? null : <PaneBody t={t} p={p} w={(n === 3 && j === 2 ? IN.w : PW) - 44} />}
        </PaneBox>
      ))}
      {showOld && (
        <div style={{...abs, left: 0, top: 0, width: R[0].w, height: R[0].h, overflow: 'hidden', background: C.bg}}>
          <div style={{...abs, left: 0, top: 0, width: IN.w, height: IN.h}}>{old}</div>
        </div>
      )}
    </div>
  );
};
