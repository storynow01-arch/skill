/* 專案自訂場景：在這裡 export 新的場景元件，type 名稱就能在 storyboard.json 使用。
   元件簽名同 scenes.tsx 的 SceneProps；只用 useTheme() 的 token，才能跟著 style 換風格。 */
import React from 'react';
import type {SceneProps} from '../scenes';
import {NET_SCENES} from './net';
import {NOTICE_SCENES} from './notice';

export const CUSTOM: Record<string, React.FC<SceneProps>> = {
  ...NET_SCENES,     // 網路教學：packetSplit / packetRoutes / packetAnatomy / ipBits / ipPrivate
  ...NOTICE_SCENES,  // 活動說明：infoGrid / parking / flow / checklist / schedule
};
