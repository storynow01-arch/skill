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
import {QaProbe} from './qa/QaProbe';
import {QaFixture} from './qa/QaFixture';

const TRANSITION = 0.4;  // 秒，來自 garychen-dark.yaml

const REG: Record<string, React.FC<any>> = {
  title_card: TitleCard, scenario: ScenarioCard, definition: DefinitionCard,
  concept_cards: ConceptCards, comparison: Comparison, quiz: QuizCard,
  closing_card: ClosingCard, qa_endcard: QAEndCard,
  flow_arrows: FlowArrows, layer_stack: LayerStack, network_diagram: NetworkDiagram,
  ui_mock: UiMock,
  _qa_fixture: QaFixture,   // 只給品檢自我測試用
};

export type SceneSpec = {id: string; type: string; startSec: number; durSec: number; props: any};
export type SectionData = {
  id: string; chapterLabel: string; audio: string; captions: Caption[];
  scenes: SceneSpec[]; style?: StyleName;
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
        return (
          <Sequence key={s.id} from={Math.round(s.startSec * fps)}
                    durationInFrames={Math.round((s.durSec + extra) * fps)}>
            <SceneFade holdSec={s.durSec + extra} fadeSec={TRANSITION}>
              <Cmp {...s.props} durSec={s.durSec} />
            </SceneFade>
          </Sequence>
        );
      })}
      <AbsoluteFill data-qa="chrome" style={{pointerEvents: 'none'}}>
        <ProgressBar />
        <ChapterIndicator label={data.chapterLabel} />
        <Logo />
      </AbsoluteFill>
      <Subtitles captions={data.captions} />
      {qa && <QaProbe w={width} h={height} />}
    </AbsoluteFill>
  );
};
