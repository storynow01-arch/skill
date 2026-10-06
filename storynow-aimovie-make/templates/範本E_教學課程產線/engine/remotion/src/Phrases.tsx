/** 以「短語」為單位換行的文字。
 *
 *  2026-10-04 品檢看圖發現：字放大到 38px 後，卡片說明常在詞中間斷開
 *  （「貼錯位置，分／信機讀不到」「每台裝／置一個」「私有／IP」）。
 *  瀏覽器對中文可以在任何兩個字之間換行，text-wrap: balance 也不懂詞。
 *
 *  做法：在標點後面、引號前後切成短語，每個短語是 inline-block ——
 *  瀏覽器只會在短語之間換行；短語本身比一行還長才會在內部斷。 */
import React, {useLayoutEffect, useRef, useState} from 'react';

//  2026-10-04：畫面文字的「；」「。」由 build_data 換成全形空白（不顯示標點），空白後面也是短語邊界。
//  2026-10-05（F10）：「，」換成 EN SPACE 記號 —— 排版後同一行內顯示「，」，換行處隱藏
//  （單行標題把逗號換成全形空白會空一大格）。隱藏用 visibility，保留寬度，換行位置不會因此改變。
export const COMMA_MARK = ' ';
const SPLIT = /(?<=[，、：；。？！…・·　 ])|(?=「|『|（)|(?<=」|』|）)/u;

export const phrases = (text: string): string[] =>
  text.split(SPLIT).filter((s) => s.length > 0);

export const Phrases: React.FC<{text: string}> = ({text}) => {
  const parts = phrases(text);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  // 每個短語後面的逗號是否在行尾（行尾就隱藏）
  const [atEnd, setAtEnd] = useState<boolean[]>([]);
  useLayoutEffect(() => {
    const next = parts.map((_, i) => {
      const a = refs.current[i], b = refs.current[i + 1];
      return !a || !b || b.offsetTop > a.offsetTop + a.offsetHeight / 2;
    });
    if (next.join() !== atEnd.join()) setAtEnd(next);
  });
  return (
    <>
      {parts.map((p, i) => {
        const comma = p.endsWith(COMMA_MARK);
        const body = comma ? p.slice(0, -1) : p;
        const end = atEnd[i] ?? false;
        return (
          <span key={i} ref={(el) => { refs.current[i] = el; }} style={{display: 'inline-block'}}>
            {body}
            {comma && (
              <span data-sep={end ? 'end' : 'mid'} style={{visibility: end ? 'hidden' : 'visible'}}>，</span>
            )}
          </span>
        );
      })}
    </>
  );
};
