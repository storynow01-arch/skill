import {C, T, FONT, L} from '../theme';

/** 左上角章節指示，格式 "01 / 08  什麼是通訊協定" */
export const ChapterIndicator: React.FC<{label: string}> = ({label}) => {
  const [num, ...rest] = label.split(/\s{2,}/);
  return (
    <div style={{position: 'absolute', top: L.chapter.y, left: L.chapter.x,
                 fontFamily: FONT, fontSize: T.chapter, letterSpacing: 1,
                 color: C.muted, display: 'flex', gap: 14}}>
      {/* 2026-10-04：primaryDim 在底色上只有 3.79:1（WCAG 要 4.5），改主色 */}
      <span style={{color: C.primary}}>{num}</span>
      <span>{rest.join(' ')}</span>
    </div>
  );
};
