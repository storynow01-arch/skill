/** 以「短語」為單位換行的文字。
 *
 *  2026-10-04 品檢看圖發現：字放大到 38px 後，卡片說明常在詞中間斷開
 *  （「貼錯位置，分／信機讀不到」「每台裝／置一個」「私有／IP」）。
 *  瀏覽器對中文可以在任何兩個字之間換行，text-wrap: balance 也不懂詞。
 *
 *  做法：在標點後面、引號前後切成短語，每個短語是 inline-block ——
 *  瀏覽器只會在短語之間換行；短語本身比一行還長才會在內部斷。 */
import React from 'react';

const SPLIT = /(?<=[，、：；。？！…・·])|(?=「|『|（)|(?<=」|』|）)/u;

export const phrases = (text: string): string[] =>
  text.split(SPLIT).filter((s) => s.length > 0);

export const Phrases: React.FC<{text: string}> = ({text}) => (
  <>
    {phrases(text).map((p, i) => (
      <span key={i} style={{display: 'inline-block'}}>{p}</span>
    ))}
  </>
);
