import React from 'react';
import {Composition} from 'remotion';
import {Trailer} from './Trailer';
import {FPS, H, TOTAL, W} from './theme';

export const RemotionRoot: React.FC = () => (
  <Composition id="Trailer" component={Trailer} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
