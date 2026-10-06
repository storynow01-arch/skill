import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig, delayRender, continueRender} from 'remotion';
import {useEffect, useState} from 'react';
import {preloadGlyphs} from './fonts';
import {SceneFade} from './SceneFade';
import {C, applyStyle, StyleName} from './theme';
import {Logo} from './chrome/Logo';
import {ProgressBar} from './chrome/ProgressBar';
import {ChapterIndicator} from './chrome/ChapterIndicator';
import {Subtitles} from './chrome/Subtitles';
import type {Caption} from '@remotion/captions';
import {TitleCard} from './scenes/TitleCard';
import {ScenarioCard} from './scenes/ScenarioCard';
import {DefinitionCard} from './scenes/DefinitionCard';
import {ConceptCards} from './scenes/ConceptCards';
import {Comparison} from './scenes/Comparison';
import {QuizCard} from './scenes/QuizCard';
import {ClosingCard} from './scenes/ClosingCard';
import {QAEndCard} from './scenes/QAEndCard';
import {FlowArrows} from './scenes/FlowArrows';
import {LayerStack} from './scenes/LayerStack';
import {NetworkDiagram} from './scenes/NetworkDiagram';
import {UiMock} from './scenes/UiMock';
import {Terminal} from './scenes/Terminal';
import {FxContext, FxFlags} from './fx';
import {PushIn} from './PushIn';
import {QaProbe} from './qa/QaProbe';
import {QaFixture} from './qa/QaFixture';

const TRANSITION = 0.4;  // 秒，來自 garychen-dark.yaml

const REG: Record<string, React.FC<any>> = {
  title_card: TitleCard, scenario: ScenarioCard, definition: DefinitionCard,
  concept_cards: ConceptCards, comparison: Comparison, quiz: QuizCard,
  closing_card: ClosingCard, qa_endcard: QAEndCard,
  flow_arrows: FlowArrows, layer_stack: LayerStack, network_diagram: NetworkDiagram,
  ui_mock: UiMock, terminal: Terminal,
  _qa_fixture: QaFixture,   // 只給品檢自我測試用
};

export type SceneSpec = {id: string; type: string; startSec: number; durSec: number; props: any};
export type SectionData = {
  id: string; chapterLabel: string; audio: string; captions: Caption[];
  scenes: SceneSpec[]; style?: StyleName;
  /** 特效試作（fx.tsx）；沒設＝正式版原樣 */
  fx?: FxFlags;
  /** 有沒有 LOGO（03_素材/brand/logo.png）；沒有就不畫右上角 LOGO */
  logo?: boolean;
};

/** qa=true 只在版面品檢時傳入（04_引擎/qa/qa_layout.mjs），正式渲染不帶 */
export const Section: React.FC<{data: SectionData; qa?: boolean}> = ({data, qa}) => {
  // 一次渲染只有一種風格；在讀任何 token 之前先套用
  applyStyle(data.style);
  const {fps, width, height} = useVideoConfig();

  // 第一格之前先把整節會用到的字全部載完（見 fonts.ts preloadGlyphs 的說明）
  const [glyphs] = useState(() => delayRender('preload-glyphs', {timeoutInMilliseconds: 120000}));
  useEffect(() => {
    const all = JSON.stringify(data.scenes.map((s) => s.props)) + data.chapterLabel
      + data.captions.map((c) => c.text).join('');
    preloadGlyphs(all).then(() => continueRender(glyphs), () => continueRender(glyphs));
  }, [data, glyphs]);

  return (
    <FxContext.Provider value={data.fx ?? {}}>
    <AbsoluteFill style={{background: C.bg}}>
      {/* 多行文字平均分配每行長度，避免標題換行後最後一行只剩「給你。」兩三個字（1-6 實測） */}
      {/* keep-all：中文只在詞邊界（build_data.py 插入的零寬空白）、空白、標點處換行；
          overflow-wrap:anywhere：單一個詞比一行還長時才允許在詞內斷，避免超框 */}
      <style>{'div, span { text-wrap: balance; word-break: keep-all; overflow-wrap: anywhere; line-break: strict; }'}</style>
      <Audio src={staticFile(data.audio)} />
      {data.scenes.map((s, i) => {
        const Cmp = REG[s.type];
        if (!Cmp) return null;
        const last = i === data.scenes.length - 1;
        // 尾端多留 0.4s 與下一場重疊 → 交叉溶接（最後一場不延長，改為直接淡出收尾）
        const extra = last ? 0 : TRANSITION;
        // 淡出要在 Sequence 最後一格剛好歸零：holdSec 用取整後的格數換算。
        // 2026-10-04 EP2 品檢 F11：原本 holdSec 沒取整，淡出還剩約 12% 時場景就被拿掉，換場最後一格整塊變暗
        const frames = Math.round((s.durSec + extra) * fps);
        return (
          <Sequence key={s.id} from={Math.round(s.startSec * fps)}
                    durationInFrames={frames}>
            <SceneFade holdSec={(frames - 1) / fps} fadeSec={TRANSITION}>
              {data.fx?.pushIn
                ? <PushIn durSec={s.durSec + extra}><Cmp {...s.props} durSec={s.durSec} /></PushIn>
                : <Cmp {...s.props} durSec={s.durSec} />}
            </SceneFade>
          </Sequence>
        );
      })}
      {data.fx?.sfx && <Sfx data={data} fps={fps} />}
      <AbsoluteFill data-qa="chrome" style={{pointerEvents: 'none'}}>
        <ProgressBar />
        <ChapterIndicator label={data.chapterLabel} />
        {data.logo !== false && <Logo />}
      </AbsoluteFill>
      <Subtitles captions={data.captions} />
      {qa && <QaProbe w={width} h={height} />}
    </AbsoluteFill>
    </FxContext.Provider>
  );
};


/** ⑤ 輕音效：卡片／項目亮起「噠」、測驗揭曉「叮」。音量約 −20dB，只在 data.fx.sfx 時加。
 *  2026-10-06 拿掉換場「咻」（whoosh.wav 是白噪音合成，使用者聽起來像雜音）。 */
const Sfx: React.FC<{data: SectionData; fps: number}> = ({data, fps}) => {
  const v = data.fx?.sfxVolume ?? 0.1;
  const hits: {at: number; src: string; vol: number}[] = [];
  data.scenes.forEach((s, i) => {
    for (const [at] of (s.props?.focusPlan ?? []) as [number, number][]) hits.push({at: s.startSec + at, src: 'sfx/tick.wav', vol: v});
    if (s.type === 'quiz' && Number.isFinite(s.props?.revealAt)) hits.push({at: s.startSec + s.props.revealAt, src: 'sfx/reveal.wav', vol: v * 1.3});
    if (s.type === 'terminal') for (const l of s.props?.lines ?? []) hits.push({at: s.startSec + l.at, src: 'sfx/tick.wav', vol: v * 0.6});
  });
  return <>{hits.map((h, k) => (
    <Sequence key={k} from={Math.round(h.at * fps)} durationInFrames={Math.round(1.2 * fps)}>
      <Audio src={staticFile(h.src)} volume={h.vol} />
    </Sequence>))}</>;
};
