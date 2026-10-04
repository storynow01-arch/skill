#!/usr/bin/env python3
"""唸法時長比對：TTS 實際把一個詞唸成什麼。

  py pron_check.py 詞1,詞2,... [--voice zh-TW-YunJheNeural --rate +18% --pitch +4Hz]

方法（2026-10-03 在教學課程產線驗證過）：同一個詞重複 4 次送 TTS，再把每個候選唸法也各送一次，
比總時長。差 ≤0.03 秒＝TTS 就是那樣唸；跟所有候選都差很多＝TTS 在自己猜，要明定唸法。
候選自動產生：英文 → 逐字母、小寫單字；數字 → 逐字（四四三）、中文整數（四百四十三）。
語音辨識（whisper）對英文縮寫、數字唸法分辨不出來，所以不用它判斷。
"""
from __future__ import annotations
import asyncio, json, subprocess, sys, tempfile
from pathlib import Path

ZH = "零一二三四五六七八九"


def zh_int(n: int) -> str:
    """整數 → 中文讀法（0～99999）"""
    if n == 0:
        return "零"
    units = [(10000, "萬"), (1000, "千"), (100, "百"), (10, "十"), (1, "")]
    out, zero = "", False
    for u, name in units:
        d = n // u % 10 if u < 10000 else n // u
        if d:
            if zero and out:
                out += "零"
            out += ("兩" if d == 2 and (u >= 1000 or (u == 100 and not out)) else ZH[d]) + name
            zero = False
        elif out:
            zero = True
    return out[1:] if out.startswith("一十") else out


def candidates(term: str) -> list[str]:
    if term.isdigit():
        return ["".join(ZH[int(c)] for c in term), zh_int(int(term))]
    alts = [" ".join(term)]
    if term.lower() != term:
        alts.append(term.lower())
    return alts


async def _syn(text, path, voice, rate, pitch):
    import edge_tts
    await edge_tts.Communicate("，".join([text] * 4) + "。", voice, rate=rate, pitch=pitch).save(path)


def _dur(p) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True)
    return float(r.stdout)


def compare_terms(terms, out=None, voice="zh-TW-YunJheNeural", rate="+18%", pitch="+4Hz"):
    out = Path(out or tempfile.mkdtemp())
    out.mkdir(parents=True, exist_ok=True)
    res = []
    for k, t in enumerate(terms):
        row = {}
        for i, s in enumerate([t] + candidates(t)):
            p = out / f"{k}_{i}.mp3"
            asyncio.run(_syn(s, p, voice, rate, pitch))
            row[s] = round(_dur(p), 2)
        raw = row[t]
        alts = {s: d for s, d in row.items() if s != t}
        best = min(alts, key=lambda s: abs(alts[s] - raw))
        same = abs(alts[best] - raw) <= 0.03
        if not same:
            verdict = f"跟候選都不同（最接近「{best}」，差 {abs(alts[best] - raw):.2f}s）→ TTS 在自己猜，請明定唸法"
        elif t.isupper() and best == t.lower():
            verdict = f"唸成英文單字「{best}」→ 縮寫通常應逐字母唸，請確認"
        else:
            verdict = f"＝「{best}」"
        res.append({"term": t, "durations": row, "closest": best, "verdict": verdict})
    return res


if __name__ == "__main__":
    for r in compare_terms(sys.argv[1].split(",")):
        print(f"{r['term']:12} {r['verdict']}   {r['durations']}")
