#!/usr/bin/env python3
"""Gemini TTS 共用模組（storynow-aimovie-make 各流程、範本 A～E 共用同一份）。

  - 金鑰（2026-10-06 規則）：**只讀「這個專案」自己的 .env.local**（GEMINI_API_KEY=…）。
          專案根目錄＝從目前資料夾往上，第一個有 .env.local／storyboard.json／CLAUDE.md／00_規範／.git 的資料夾；
          不讀系統環境變數、不再往更上層找（別的專案的付費金鑰不能被借用）。沒有金鑰 → 呼叫端改用 edge-tts
  - 模型：model="auto"（預設）→ 查 /v1beta/models，自動用「最新的正式版 Flash TTS」
          （排除 lite、preview；目前是 gemini-3.8-flash-tts）。想固定版本就寫完整名稱，或設環境變數 GEMINI_TTS_MODEL
  - 聲音：voice 可以是 Gemini 現成聲音名（Puck、Achird…）、設計過的 voice id（voice_…），
          或只給 description → 第一次自動「聲音設計」，id 由呼叫端存回設定檔
  - 時間戳：Gemini 不回傳 → synth_lines() 一次送多句，再用 faster-whisper 逐字時間＋difflib 對齊已知文稿切回每一句

只用標準函式庫＋numpy（對齊時才載入 faster-whisper）。
"""
from __future__ import annotations
import base64, difflib, io, json, os, re, sys, time, urllib.error, urllib.request, wave
from pathlib import Path

API = "https://generativelanguage.googleapis.com/v1beta/"
DEFAULT_DESCRIPTION = ("25 歲左右的台灣年輕男老師，說標準台灣華語（台灣口音、不捲舌、不帶北京腔兒化音），熱情開朗、充滿活力、"
                       "笑著講課，親切像大哥哥，咬字清楚，語速稍快。聲音中等厚度、中音域、圓潤飽滿溫暖，穩重又有精神。")
DEFAULT_STYLE = "熱情開朗的年輕男老師在上課，笑著講、有活力，台灣華語口音，語速稍快但咬字清楚"
SR = 24000            # Gemini 輸出：24 kHz mono 16-bit


class Quota(Exception):
    """每日配額用完（每分鐘限制會自動等待重試，不會丟這個）"""


# ── 金鑰 ─────────────────────────────────────────────────────
_MARKERS = (".env.local", "storyboard.json", "CLAUDE.md", "00_規範", ".git")
_KEY: dict[str, str] = {}


def project_root(start: str | Path | None = None) -> Path:
    d = Path(start or os.getcwd()).resolve()
    for p in [d, *d.parents]:
        if any((p / m).exists() for m in _MARKERS):
            return p
    return d


def project_key(start: str | Path | None = None) -> str:
    """這個專案 .env.local 的 GEMINI_API_KEY；沒有（或還是範本的「請貼上」）回傳空字串。
    系列教學（2026-10-09）：這一節沒有 .env.local 時，讀所屬科目資料夾（有 系列設定.md 的上一層）的 .env.local——
    一科貼一次、整科共用；不會讀到不相干的上層專案。"""
    root = project_root(start)
    envs = [root / ".env.local"]
    if not envs[0].exists() and (root.parent / "系列設定.md").exists():
        envs.append(root.parent / ".env.local")
    for env in envs:
        if env.exists():
            for line in env.read_text(encoding="utf-8").splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    k = line.split("=", 1)[1].strip()
                    if k and "請貼" not in k:
                        return k
    return ""


def has_key(start: str | Path | None = None) -> bool:
    """配音選擇規則：True＝用 Gemini Flash TTS；False＝用 edge-tts"""
    return bool(project_key(start))


def api_key(start: str | Path | None = None) -> str:
    if "k" in _KEY and start is None:
        return _KEY["k"]
    k = project_key(start)
    if not k:
        raise SystemExit(f"這個專案（{project_root(start)}）的 .env.local 沒有 GEMINI_API_KEY → 依規則改用 edge-tts")
    _KEY["k"] = k
    return k


def call(method: str, path: str, body: dict | None = None, query: str = "") -> dict:
    req = urllib.request.Request(API + path + (("?" + query) if query else ""), method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"x-goog-api-key": api_key(), "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            # 2026-10-06：逾時 600 → 240 秒（連線卡住時要等 10 分鐘才重試，1-4 實測卡 30 分鐘）
            return json.load(urllib.request.urlopen(req, timeout=240))
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code == 429:
                # 「每天 10 次」其實是滾動計算：訊息會寫還要等多久（retry in 4m10s／11h18m5s）。
                # 10 分鐘內就自動等再試；更久才當作今天用完（2026-10-05 實測）
                m = re.search(r"retry in (?:(\d+)h)?(?:(\d+)m)?(?:(\d+)(?:\.\d+)?s)?", msg)
                wait = (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)) if m else 0
                if 0 < wait <= 600 and attempt < 4:
                    print(f"  … Gemini 配額 {wait} 秒後恢復，等待中", flush=True)
                    time.sleep(wait + 5)
                    continue
                if "PerDay" in msg or "per day" in msg.lower() or attempt == 4:
                    raise Quota(msg[:800])
                time.sleep(25 * (attempt + 1))          # 每分鐘限制：等一下再試
                continue
            if e.code >= 500 and attempt < 4:
                time.sleep(10 * (attempt + 1))
                continue
            raise RuntimeError(f"Gemini HTTP {e.code}: {msg[:800]}")
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
            # 網路層錯誤（SSL 被切斷、逾時、ERR_NO_BUFFER_SPACE）：等一下重試（2026-10-05 實測 SSLEOFError）
            if attempt < 4:
                time.sleep(8 * (attempt + 1))
                continue
            raise RuntimeError(f"Gemini 連線失敗：{e}")
    raise RuntimeError("Gemini 重試失敗")


# ── 模型：自動用最新的 Flash TTS ─────────────────────────────
_MODEL_CACHE: dict[str, str] = {}


def resolve_model(model: str = "auto", lite: bool = False) -> str:
    if os.environ.get("GEMINI_TTS_MODEL"):
        return os.environ["GEMINI_TTS_MODEL"]
    if model and model != "auto":
        return model
    key = "lite" if lite else "flash"
    if key in _MODEL_CACHE:
        return _MODEL_CACHE[key]
    names = [m["name"].split("/")[-1] for m in call("GET", "models", query="pageSize=1000").get("models", [])]
    pat = re.compile(r"gemini-(\d+(?:\.\d+)*)-flash-lite-tts$" if lite else r"gemini-(\d+(?:\.\d+)*)-flash-tts$")
    found = sorted(((tuple(int(x) for x in m.group(1).split(".")), n) for n in names if (m := pat.match(n))),
                   reverse=True)
    if not found:
        raise RuntimeError(f"找不到正式版 {'Flash-Lite' if lite else 'Flash'} TTS 模型：{[n for n in names if 'tts' in n]}")
    _MODEL_CACHE[key] = found[0][1]
    return found[0][1]


# ── 聲音 ─────────────────────────────────────────────────────
def design_voice(description: str = DEFAULT_DESCRIPTION, *, gender: str = "male", language_code: str = "zh-TW",
                 name: str = "narrator", model: str = "auto") -> str:
    """用文字描述設計聲音，回傳 voice id（存在 Gemini 專案裡一年；呼叫端要把 id 存回設定檔）"""
    r = call("POST", "voices", {"store": True, "voice": {
        "model": resolve_model(model), "type": "prompted", "display_name": name[:60], "gender": gender,
        "language_code": language_code, "prompted": {"input": description}}})
    return r["id"]


def synth(text: str, voice: str, *, style: str = DEFAULT_STYLE, model: str = "auto") -> bytes:
    """一段文字 → WAV bytes（24 kHz mono）"""
    content = {"type": "text", "text": text}
    if style:
        content["annotations"] = [{"type": "speech_metadata", "style": style}]
    r = call("POST", "interactions", {
        "model": resolve_model(model), "input": [{"type": "user_input", "content": [content]}],
        "response_format": {"type": "audio"}, "generation_config": {"speech_config": [{"voice": voice}]}})
    data = [c["data"] for s in r.get("steps", []) for c in s.get("content", []) if c.get("data")]
    if not data:
        raise RuntimeError(f"Gemini 回應沒有音訊：{json.dumps(r, ensure_ascii=False)[:400]}")
    raw = base64.b64decode(data[0])
    if raw[:4] != b"RIFF":                         # 串流格式是無標頭 PCM：補 WAV 標頭
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(raw)
        raw = buf.getvalue()
    return raw


# ── 對齊：已知文稿 ↔ whisper 逐字時間 ──────────────────────────
_WHISPER = None
HAN = re.compile(r"[一-鿿A-Za-z0-9]")


def _char_times(wav_path: str):
    global _WHISPER
    if _WHISPER is None:
        from faster_whisper import WhisperModel
        _WHISPER = WhisperModel(os.environ.get("ALIGN_WHISPER", "small"), device="cpu", compute_type="int8")
    segs, _ = _WHISPER.transcribe(wav_path, language="zh", word_timestamps=True,
                                  initial_prompt="以下是繁體中文的旁白。")
    chars, times = [], []
    for s in segs:
        for w in s.words:
            cs = [c for c in w.word if HAN.match(c)]
            for k, c in enumerate(cs):
                chars.append(c.lower())
                times.append((w.start + (w.end - w.start) * k / len(cs), w.start + (w.end - w.start) * (k + 1) / len(cs)))
    return "".join(chars), times


def align(sentences: list[str], wav_path: str) -> list[tuple[float, float]]:
    """每句在音檔中的起訖秒數。同音錯字不影響（difflib 對到的字取時間，沒對到的前後內插）"""
    heard, times = _char_times(wav_path)
    script = [(i, c.lower()) for i, s in enumerate(sentences) for c in s if HAN.match(c)]
    a = "".join(c for _, c in script)
    t_of = [None] * len(a)
    for blk in difflib.SequenceMatcher(None, a, heard, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            t_of[blk.a + k] = times[blk.b + k]
    known = [k for k, t in enumerate(t_of) if t]
    if not known:
        raise RuntimeError("對齊失敗：辨識結果與文稿完全對不上")
    for k in range(len(a)):
        if t_of[k] is None:
            prev = max((j for j in known if j < k), default=None)
            nxt = min((j for j in known if j > k), default=None)
            if prev is None:
                t_of[k] = (t_of[nxt][0],) * 2
            elif nxt is None:
                t_of[k] = (t_of[prev][1],) * 2
            else:
                x = t_of[prev][1] + (t_of[nxt][0] - t_of[prev][1]) * (k - prev) / (nxt - prev)
                t_of[k] = (x, x)
    out = []
    for i in range(len(sentences)):
        idx = [k for k, (si, _) in enumerate(script) if si == i]
        out.append((t_of[idx[0]][0], t_of[idx[-1]][1]) if idx else ((out[-1][1],) * 2 if out else (0.0, 0.0)))
    return out


def synth_lines(lines: list[str], voice: str, *, style: str = DEFAULT_STYLE, model: str = "auto",
                chunk_chars: int = 700, workdir: str | Path = ".") -> list[bytes]:
    """多句一起送（省配額：一次請求約 2 分鐘的稿），再依對齊結果切回每一句的 WAV bytes。
    切點＝相鄰兩句之間停頓的中點，所以每句頭尾都是靜音。"""
    import numpy as np
    workdir = Path(workdir); workdir.mkdir(parents=True, exist_ok=True)
    groups, cur, n = [], [], 0
    for i, s in enumerate(lines):
        c = len(re.sub(r"\s", "", s))
        if cur and n + c > chunk_chars:
            groups.append(cur); cur, n = [], 0
        cur.append(i); n += c
    if cur:
        groups.append(cur)
    out: list[bytes] = [b""] * len(lines)
    for g in groups:
        wav_bytes = synth("\n".join(lines[i] for i in g), voice, style=style, model=model)
        tmp = workdir / f"_chunk_{os.getpid()}.wav"
        tmp.write_bytes(wav_bytes)
        spans = align([lines[i] for i in g], str(tmp))
        with wave.open(str(tmp)) as w:
            sr, x = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), np.int16)
        cuts = [0.0] + [(spans[k][1] + spans[k + 1][0]) / 2 for k in range(len(g) - 1)] + [len(x) / sr]
        for k, i in enumerate(g):
            seg = x[int(cuts[k] * sr):int(cuts[k + 1] * sr)]
            buf = io.BytesIO()
            with wave.open(buf, "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(seg.tobytes())
            out[i] = buf.getvalue()
        tmp.unlink(missing_ok=True)
    return out


if __name__ == "__main__":
    # 自我檢查：py gemini_tts.py  → 印出目前會用的模型
    print("Flash TTS:", resolve_model("auto"))
    print("Flash-Lite TTS:", resolve_model("auto", lite=True))


# ── 壞音檔關卡（2026-10-06：Gemini 偶爾回傳「後半段整段無聲」的音檔，2-8、2-14 實際遇到）──
def bad_audio(wav_bytes: bytes, text: str, *, silence_db: float = -38.0) -> str:
    """回傳問題說明（空字串＝正常）。每秒不到 2 字（30 字以上），或中間空白超過 6 秒（稿子有「……」思考停頓放寬到 12 秒）"""
    import numpy as np
    with wave.open(io.BytesIO(wav_bytes)) as w:
        sr, x = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    dur = len(x) / sr if sr else 0
    chars = len(re.sub(r"[^一-鿿A-Za-z0-9]", "", text))
    if chars >= 30 and dur and chars / dur < 2.0:
        return f"{chars} 字配了 {dur:.1f} 秒（{chars / dur:.1f} 字/秒）"
    hop = int(sr * 0.05) or 1
    frames = x[:len(x) // hop * hop].reshape(-1, hop)
    db = 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9)
    run = best = 0
    for v in db:
        run = run + 1 if v < silence_db else 0
        best = max(best, run)
    longest = best * hop / sr
    limit = 12.0 if "……" in text else 6.0
    if longest > limit:
        return f"中間有 {longest:.1f} 秒空白（上限 {limit:.0f} 秒）"
    return ""
