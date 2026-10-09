"""scan_projects.py 後備進度的測試：python -m unittest discover -s tests -p "test_*.py"（在 task-dashboard 資料夾執行）"""
import json, os, sys, tempfile, time, unittest
from datetime import datetime, timezone
from pathlib import Path

sys.argv = sys.argv[:1]                      # scan_projects 會讀 argv[1] 當天數
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scan"))
import scan_projects as sp  # noqa: E402

T0 = 1_790_000_000.0


def iso(t: float) -> str:
    return datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def create(tid: str, t: float) -> dict:
    return {"type": "user", "timestamp": iso(t), "toolUseResult": {"task": {"id": tid, "subject": f"項目{tid}"}}}


def change(tid: str, frm: str, to: str, t: float) -> dict:
    return {"type": "user", "timestamp": iso(t),
            "toolUseResult": {"success": True, "taskId": tid, "updatedFields": ["status"],
                              "statusChange": {"from": frm, "to": to}}}


class TaskPlanTest(unittest.TestCase):
    def write(self, rows: list[dict], mtime: float) -> Path:
        d = tempfile.mkdtemp()
        p = Path(d) / "s.jsonl"
        lines = [json.dumps({"type": "assistant", "message": {"content": [{"type": "text", "text": "嗨"}]}})]
        # 和 Claude Code 紀錄一樣是緊湊格式（掃描靠 "toolUseResult":{"task":{ 這類記號找行）
        lines += [json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows]
        p.write_text("\n".join(lines) + "\n", encoding="utf-8")
        os.utime(p, (mtime, mtime))
        return p

    def test_沒有工作清單就是_None(self):
        p = self.write([], T0)
        self.assertIsNone(sp.task_plan(p, T0))

    def test_完成數與預計時間(self):
        rows = [create(str(i), T0 + i) for i in range(1, 5)]
        rows += [change("1", "pending", "completed", T0 + 600),         # 10 分
                 change("2", "pending", "completed", T0 + 1800),        # 20 分
                 change("3", "pending", "deleted", T0 + 1900)]
        now = T0 + 1900
        p = self.write(rows, now)
        pl = sp.task_plan(p, now)
        self.assertEqual((pl["done"], pl["total"], pl["pct"], pl["label"], pl["source"]), (2, 3, 67, "項", "tasks"))
        self.assertEqual(pl["perMin"], 20)                               # 中位數取較大那個（偶數取後半）
        self.assertEqual(pl["eta"], int(now + 1 * 1200))
        self.assertFalse(pl["paused"])

    def test_一起勾完的平均分攤_且做完開新清單(self):
        rows = [create("1", T0), create("2", T0 + 1)]
        rows += [change("1", "pending", "completed", T0 + 1200), change("2", "pending", "completed", T0 + 1210)]
        rows += [create("3", T0 + 2000), create("4", T0 + 2001)]                   # 前一份做完 → 新清單
        rows += [change("3", "pending", "completed", T0 + 2600)]
        now = T0 + 2600
        pl = sp.task_plan(self.write(rows, now), now)
        self.assertEqual((pl["done"], pl["total"]), (1, 2))
        self.assertEqual(pl["perMin"], 10)

    def test_對話停很久就暫停_不估時間(self):
        rows = [create("1", T0), create("2", T0 + 1), change("1", "pending", "completed", T0 + 600)]
        p = self.write(rows, T0 + 600)
        pl = sp.task_plan(p, T0 + 600 + 3600)
        self.assertTrue(pl["paused"])
        self.assertIsNone(pl["eta"])

    def test_全部完成(self):
        rows = [create("1", T0), change("1", "pending", "completed", T0 + 300)]
        pl = sp.task_plan(self.write(rows, T0 + 300), T0 + 9999)
        self.assertEqual(pl["pct"], 100)
        self.assertFalse(pl["paused"])

    def test_工作清單md勾選框(self):
        self.assertIsNone(sp.md_plan(0, 0))
        pl = sp.md_plan(3, 1)
        self.assertEqual((pl["done"], pl["total"], pl["pct"], pl["eta"], pl["source"]), (1, 4, 25, None, "md"))


if __name__ == "__main__":
    unittest.main()
