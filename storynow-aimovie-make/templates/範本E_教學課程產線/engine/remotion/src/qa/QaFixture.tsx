/* 品檢自我測試專用的「故意做壞」場景（qa/selftest.py 才會用到，正式分鏡不會出現 _qa_fixture）。
   variant 決定壞在哪裡，用來確認 QaProbe 真的抓得到。 */
import {AbsoluteFill} from 'remotion';
import {C, FONT} from '../theme';

export const QaFixture: React.FC<{variant: 'overlap' | 'contrast' | 'offcenter' | 'tightgap' | 'empty' | 'midbreak' | 'offscreen'}> = ({variant}) => {
  const card = (x: number, y: number, label: string) => (
    <div style={{position: 'absolute', left: x, top: y, width: 420, height: 260, background: C.card,
                 border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 44, padding: 30}}>{label}</div>
  );
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      {variant === 'overlap' && <>{card(600, 300, '甲')}{card(860, 380, '乙')}</>}
      {variant === 'contrast' && (
        <div style={{position: 'absolute', left: 660, top: 400, width: 600, textAlign: 'center',
                     color: '#3a3a3a', fontSize: 38}}>這行字跟底色幾乎一樣</div>)}
      {variant === 'offcenter' && (
        <div style={{position: 'absolute', left: 140, top: 400, color: C.text, fontSize: 64}}>整塊內容擠在左邊</div>)}
      {variant === 'midbreak' && (
        <div style={{position: 'absolute', left: 860, top: 400, width: 200, textAlign: 'center',
                     color: C.text, fontSize: 44}}>權威伺服器管理員</div>)}
      {variant === 'offscreen' && (
        <div style={{position: 'absolute', left: 1700, top: 400, color: C.text, fontSize: 64, whiteSpace: 'nowrap'}}>這行字超出畫面右緣</div>)}
      {/* variant === 'empty'：什麼都不畫，測「畫面空白」 */}
      {variant === 'tightgap' && <>
        <div style={{position: 'absolute', left: 660, top: 400, width: 600, textAlign: 'center', color: C.text, fontSize: 44}}>上面一行標題</div>
        <div style={{position: 'absolute', left: 660, top: 470, width: 600, textAlign: 'center', color: C.text, fontSize: 38}}>下面一行緊貼著</div>
      </>}
    </AbsoluteFill>
  );
};
