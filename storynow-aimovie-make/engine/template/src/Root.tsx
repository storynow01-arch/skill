import React from 'react';
import {Composition, CalculateMetadataFunction} from 'remotion';
import {Spec, Video} from './Video';
import {Gallery, GALLERY_FRAMES} from './Gallery';
import spec from './data/spec.json';
import {TemplateA} from './tpl/TemplateA';
import {TemplateB} from './tpl/TemplateB';
import {TemplateC} from './tpl/TemplateC';
import {TemplateD} from './tpl/TemplateD';

const calc: CalculateMetadataFunction<Spec> = ({props}) => ({
  durationInFrames: props.totalFrames, fps: props.fps, width: props.width, height: props.height,
});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Video" component={Video} defaultProps={spec as unknown as Spec} calculateMetadata={calc}
      durationInFrames={300} fps={30} width={1920} height={1080} />
    {/* 範本風格：同一份 spec，四種畫面 */}
    <Composition id="TemplateA" component={TemplateA as unknown as React.FC<Spec>} defaultProps={spec as unknown as Spec} calculateMetadata={calc} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="TemplateB" component={TemplateB as unknown as React.FC<Spec>} defaultProps={spec as unknown as Spec} calculateMetadata={calc} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="TemplateC" component={TemplateC as unknown as React.FC<Spec>} defaultProps={spec as unknown as Spec} calculateMetadata={calc} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="TemplateD" component={TemplateD as unknown as React.FC<Spec>} defaultProps={spec as unknown as Spec} calculateMetadata={calc} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="Gallery" component={Gallery} durationInFrames={GALLERY_FRAMES} fps={30} width={1920} height={1080} />
  </>
);
