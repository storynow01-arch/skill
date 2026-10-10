import React from 'react';
import {Composition} from 'remotion';
import {Ad, FontTest} from './Ad';
import T from './timeline.json';

/* 片長讀 timeline.json（make_ad.py 依 storyboard 內容算好寫進來）。FontTest＝全字測試圖（只在檢查缺字時用 npx remotion still 單獨算） */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Ad" component={Ad} durationInFrames={T.frames} fps={T.fps} width={1920} height={1080} />
    <Composition id="FontTest" component={FontTest} durationInFrames={1} fps={T.fps} width={1920} height={1080} />
  </>
);
