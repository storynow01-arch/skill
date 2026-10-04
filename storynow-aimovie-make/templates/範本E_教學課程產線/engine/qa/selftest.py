#!/usr/bin/env python3
"""品檢的自我測試：故意把一支「已知正常」的影片做壞，確認每一種缺陷都會被抓到。

  py qa\\selftest.py [節=1-1] [影片=05_輸出_節\\v2\\1-1.mp4]

道理跟寫程式的單元測試一樣：品檢說「沒問題」只有在它「有問題時真的會叫」的前提下才可信。
每一項都先量正常版（應為 0），再量做壞的版本（應 >0），兩個都對才算這項檢查有效。

做壞的方式：
  影片層（ffmpeg 改成片）：黑畫面、中段無聲、音量 −10dB、畫面凍結、字幕閃 1 格、字幕每 4 格抖 12px
  資料層（改字幕／焦點資料）：句尾標點、唸法殘留、字幕與稿子不符、物件沒對旁白、講完又循環
  版面層（改場景內容後用瀏覽器量）：卡片 5 張超出畫面、超長標題、文字塞進字幕區
"""
from __future__ import annotations
import copy, json, subprocess, sys, tempfile
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
ROOT = ENGINE.parent
sys.path.insert(0, str(ENGINE)); sys.path.insert(0, str(ENGINE / "qa"))
from qa_run import (band_scan, blacks, caption_pages, check_captions, check_sync, loudness,  # noqa: E402
                    silences, DATA, FPS)
from verify_motion import analyse  # noqa: E402

CLIP = 60.0      # 取前 60 秒來做


def ff(args):
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", *args], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-400:])


def main(sid="1-1", src=None):
    src = Path(src) if src else ROOT / "05_輸出_節" / "v2" / f"{sid}.mp4"
    data = json.loads((DATA / f"{sid}.json").read_text(encoding="utf-8"))
    tmp = Path(tempfile.mkdtemp(prefix="qa_selftest_"))
    base = tmp / "base.mp4"
    ff(["-i", str(src), "-t", str(CLIP), "-c", "copy", str(base)])

    pages = [p for p in caption_pages(data["captions"]) if p["f1"] < CLIP * FPS - 30]
    boundary = pages[len(pages) // 2]["f1"]                 # 中段某一次換頁的那一格
    pg = max(pages, key=lambda p: p["f1"] - p["f0"])         # 顯示最久的一頁，用來做抖動
    results = []

    def case(name, measure, make=None, expect="increase"):
        before = measure(base)
        if make:
            bad = tmp / f"{len(results)}.mp4"
            make(bad)
            after = measure(bad)
        else:
            after = None
        ok = (before == 0 and after and after > 0) if expect == "increase" else expect(before, after)
        results.append((name, before, after, ok))
        print(f"{'✓' if ok else '✗'} {name:<22} 正常版 {before!s:>8}   做壞版 {after!s:>8}", flush=True)

    # ── 影片層 ──
    case("V2 黑畫面", lambda p: len(blacks(p)),
         lambda o: ff(["-i", str(base), "-vf", "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='between(t,20,20.6)'",
                       "-c:a", "copy", str(o)]))
    case("A3 中段無聲", lambda p: len(silences(p, CLIP)),
         lambda o: ff(["-i", str(base), "-af", "volume=0:enable='between(t,25,28)'", "-c:v", "copy", str(o)]))
    case("A1 響度差 10dB", lambda p: round(loudness(p)["I"] or 0, 1),
         lambda o: ff(["-i", str(base), "-af", "volume=-10dB", "-c:v", "copy", str(o)]),
         expect=lambda b, a: a is not None and 9.0 <= b - a <= 11.0)
    case("V3 畫面凍結 6 秒", lambda p: analyse(p)["max_still"],
         # 第 900 格（30 秒）重複 180 次＝凍結 6 秒
         lambda o: ff(["-i", str(base), "-vf", "loop=loop=180:size=1:start=900,setpts=N/FRAME_RATE/TB,trim=0:60",
                       "-af", "atrim=0:60", str(o)]),
         expect=lambda b, a: a is not None and a >= 5.5 and a > b)

    from final_qa import jumps
    case("V5 畫面突跳（單格位移 40px）", lambda p: len(jumps(p)),
         lambda o: ff(["-i", str(base), "-filter_complex",
                       "[0:v]split[m][s];[s]crop=1920:700:0:160[c];[m][c]overlay=x=0:y=200:enable='eq(n,600)'",
                       "-c:a", "copy", str(o)]))

    def flicker(p):
        return check_captions(sid, data, p, band_scan(p))["C2"]["count"]
    case("C2 字幕換頁閃 1 格", flicker,
         lambda o: ff(["-i", str(base), "-vf",
                       f"drawbox=x=0:y=930:w=iw:h=90:color=0x181818:t=fill:enable='eq(n,{boundary})'",
                       "-c:a", "copy", str(o)]))

    def jitter(p):
        return check_captions(sid, data, p, band_scan(p))["C3"]["count"]
    a, b = pg["f0"] + 6, pg["f1"] - 6
    case("C3 字幕每 4 格抖 12px", jitter,
         lambda o: ff(["-i", str(base), "-filter_complex",
                       f"[0:v]split[m][s];[s]crop=1920:90:0:930[band];"
                       f"[m][band]overlay=x=12:y=930:enable='between(n,{a},{b})*not(mod(n,4))'",
                       "-c:a", "copy", str(o)]))

    # ── 資料層 ──
    def data_case(name, key, mutate, field):
        d2 = copy.deepcopy(data)
        mutate(d2)
        b0 = check_captions(sid, data, None, None)[key][field] if key.startswith("C") else None
        b1 = check_captions(sid, d2, None, None)[key][field]
        # 數量型：正常 0、做壞 >0；一致型（C6）：正常 True、做壞 False。注意 Python 裡 1 == True，不能混著比
        ok = (b0 is True and b1 is False) if isinstance(b0, bool) else (b0 == 0 and b1 > 0)
        results.append((name, b0, b1, ok))
        print(f"{'✓' if ok else '✗'} {name:<22} 正常版 {b0!s:>8}   做壞版 {b1!s:>8}", flush=True)

    data_case("C1 句尾標點", "C1", lambda d: [c.update(text=c["text"] + "。") for c in d["captions"][:5]], "count")
    data_case("C5 唸法文字殘留", "C5", lambda d: d["captions"][3].update(text="D N S 查不到"), "count")
    data_case("C7 字幕以「的」開頭", "C7", lambda d: d["captions"][6].update(text="的" + d["captions"][6]["text"]), "count")
    data_case("C4 字幕超過 18 字", "C4", lambda d: d["captions"][4].update(text="這一頁字幕故意寫得非常非常長超過了規範的十八個字上限"), "long")
    data_case("C6 字幕與稿子不符", "C6", lambda d: d["captions"][7].update(text="這一句被改掉了"), "match")

    def sync_case(name, mutate, pick):
        d2 = copy.deepcopy(data)
        mutate(d2)
        b0, b1 = pick(check_sync(sid, data)), pick(check_sync(sid, d2))
        ok = b0 == 0 and b1 > 0
        results.append((name, b0, b1, ok))
        print(f"{'✓' if ok else '✗'} {name:<22} 正常版 {b0!s:>8}   做壞版 {b1!s:>8}", flush=True)

    driven = [s for s in data["scenes"] if s.get("props", {}).get("focusPlan")]
    target = driven[0]["id"]

    def drop_plan(d):
        next(s for s in d["scenes"] if s["id"] == target)["props"].pop("focusPlan")

    def add_loop(d):
        s = next(s for s in d["scenes"] if s["id"] == target)
        fp = s["props"]["focusPlan"]
        s["props"]["focusPlan"] = fp + [[min(s["durSec"] - 0.2, fp[-1][0] + 1.0), 0]]
    sync_case("S1 物件沒對旁白", drop_plan, lambda r: len(r["S1"]["undriven"]))
    sync_case("S2 講完又循環", add_loop, lambda r: r["S2"]["loop_points"])

    # ── 版面層：交給 qa_layout.mjs 量一個故意做壞的場景 ──
    bad = copy.deepcopy(data)
    # 卡片、連線圖都已改成依數量自動縮寬，排不出畫面了；「超出畫面」改由 _qa_fixture offscreen 測
    nodes = [{"label": f"節點{i + 1}", "icon": "🖥️"} for i in range(9)]
    bad["scenes"] = [
        {"id": "T1", "type": "network_diagram", "startSec": 0, "durSec": 6,
         "props": {"heading": "九個節點排一列會超出畫面", "nodes": nodes}},
        {"id": "T2", "type": "definition", "startSec": 6, "durSec": 6,
         "props": {"bigText": "這是一個非常非常長的定義句子，故意寫到超過畫面寬度好幾倍，用來測試標題會不會被排成三行以上，以及最後一行是不是只剩兩個字的情況呀",
                   "label": "測試"}},
    ]
    for k, v in enumerate(("overlap", "contrast", "offcenter", "tightgap", "empty", "midbreak", "offscreen")):
        bad["scenes"].append({"id": f"T{3 + k}", "type": "_qa_fixture", "startSec": 12 + k * 6, "durSec": 6,
                              "props": {"variant": v}})
    bad["captions"] = bad["captions"][:3]
    (DATA / "_selftest.json").write_text(json.dumps(bad, ensure_ascii=False), encoding="utf-8")
    try:
        r = subprocess.run(["node", "qa_layout.mjs", str(tmp), "_selftest"], cwd=ENGINE / "remotion",
                           capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True)
        lay = json.loads((tmp / "layout__selftest.json").read_text(encoding="utf-8"))
        kinds = {i["kind"] for x in lay for i in x.get("issues", [])}
    finally:
        (DATA / "_selftest.json").unlink(missing_ok=True)
    for k in ("超出畫面", "標題過長", "圖塊重疊", "對比不足", "版面偏移", "間距過小", "畫面空白", "詞中斷行"):
        ok = k in kinds
        results.append((f"L {k}", "—", "抓到" if ok else "沒抓到", ok))
        print(f"{'✓' if ok else '✗'} L {k:<20} 做壞版 {'抓到' if ok else '沒抓到'}", flush=True)

    n_ok = sum(1 for r in results if r[3])
    print(f"\n自我測試：{n_ok}/{len(results)} 項有效")
    out = ROOT / "11_品檢" / "自我測試.json"
    out.write_text(json.dumps([{"項目": r[0], "正常版": r[1], "做壞版": r[2], "有效": r[3]} for r in results],
                              ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {out}")
    return n_ok == len(results)


if __name__ == "__main__":
    sys.exit(0 if main(*sys.argv[1:]) else 1)
