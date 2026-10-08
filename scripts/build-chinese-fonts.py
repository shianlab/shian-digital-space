"""Build local UI subsets and a broad Chinese font for visitor input.

Source: LXGW WenKai v1.522, SIL OFL 1.1; see public/fonts/OFL-LXGW-WenKai.txt.
Run with fonttools + brotli installed; first argument is the original TTF.
Modified subsets use a distinct family name. No visitor input is collected.
"""
from pathlib import Path
import json
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
source_font = TTFont(source)
available = set(source_font.getBestCmap())
source_font.close()
text = "".join(p.read_text(encoding="utf-8") for p in (ROOT / "src").rglob("*")
               if p.suffix in {".js", ".jsx", ".scss"})
text += (ROOT / "public" / "start" / "index.html").read_text(encoding="utf-8")
ui_chars = set(map(ord, text)) | set(range(32, 127))
cjk_chars = set(range(32, 0x3400)) | set(range(0x3400, 0xA000)) | set(range(0xFF00, 0xFFF0))
out = ROOT / "public" / "fonts"
report = {}
for name, chars, formats in [("UI", ui_chars, ("woff", "woff2")), ("CJK", cjk_chars, ("woff",))]:
    font = TTFont(source)
    options = subset.Options()
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_legacy = True
    options.name_languages = [0x409]
    tool = subset.Subsetter(options=options)
    tool.populate(unicodes=chars & available)
    tool.subset(font)
    for record in font["name"].names:
        if record.nameID in (1, 3, 4, 6):
            new_name = f"ShianWenKai-{name}" if record.nameID == 6 else f"Shian WenKai {name}"
            record.string = new_name.encode(record.getEncoding())
    for flavor in formats:
        font.flavor = flavor
        target = out / f"ShianWenKai-{name}.{flavor}"
        font.save(target)
        report[target.name] = {"bytes": target.stat().st_size, "glyphs": len(font.getBestCmap())}
    font.close()
missing_han = [chr(cp) for cp in sorted(ui_chars - available) if 0x3400 <= cp <= 0x9FFF]
report["missingUIHan"] = missing_han
(out / "chinese-font-manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
if missing_han:
    raise SystemExit("UI has missing Chinese glyphs")
