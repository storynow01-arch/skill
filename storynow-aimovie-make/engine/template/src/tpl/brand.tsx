/* 品牌 LOGO（範本 A～D 共用）：storyboard 設 "brand" 時，build.py 把 logo 複製成 public/brand_logo.*，
   這裡固定畫在右上角（距右 40、距上 26、寬 220，同範本E）。data-qa="logo"＝品檢保留區，內容碰到就列必修。 */
import React from 'react';
import {Img, staticFile} from 'remotion';

export const LOGO_BOX = {right: 40, top: 26, width: 220};
export const BrandLogo: React.FC<{logo?: string | null}> = ({logo}) =>
  logo ? <Img data-qa="logo" src={staticFile(logo)} style={{position: 'absolute', top: LOGO_BOX.top, right: LOGO_BOX.right, width: LOGO_BOX.width, zIndex: 50}} /> : null;
