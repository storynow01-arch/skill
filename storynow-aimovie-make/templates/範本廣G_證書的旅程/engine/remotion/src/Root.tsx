import React from 'react';
import {Composition} from 'remotion';
import {Ad} from './Ad';
import T from './timeline.json';

/* 片長讀 timeline.json（make_ad.py 依 storyboard 內容算好寫進來） */
export const RemotionRoot: React.FC = () => (
  <Composition id="Ad" component={Ad} durationInFrames={T.frames} fps={T.fps} width={1920} height={1080} />
);
