"""Construit la version express en BD (25 pages) de « C'est combien ? ».

Usage : python3 version-courte/build_court.py   (depuis ebook-cest-combien)
Personnages : version-courte/personnages/{coach,awa,cliente}.png (prioritaire) ou .svg
Syntaxe BD dans court.md :  @coach: texte   @awa: texte   @cliente: texte   @note: texte
"""
import re
from pathlib import Path

import markdown
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BUILD = ROOT / "build"
OUT = ROOT / "livrables" / "C-est-combien_Version-express-BD_DEO-CI.pdf"
SIDE = {"coach": "left", "cliente": "left", "awa": "right"}
NAMES = {"coach": "Le coach", "cliente": "La cliente", "awa": "Awa"}


def char_src(role):
    for ext in ("png", "jpg", "webp", "svg"):
        p = HERE / "personnages" / f"{role}.{ext}"
        if p.exists():
            return p.as_uri()
    raise FileNotFoundError(role)


def inline(t):
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    return re.sub(r"\*(.+?)\*", r"<i>\1</i>", t)


def row(role, side, text):
    if role == "note":
        return f'<div class="bd-note">{inline(text)}</div>'
    return (f'<div class="bd-row {side}"><figure class="who"><img src="{char_src(role)}" alt="{NAMES[role]}">'
            f'<figcaption>{NAMES[role]}</figcaption></figure><div class="bubble">{inline(text)}</div></div>')


def preprocess(src):
    out, buf = [], []
    for line in src.split("\n"):
        m = re.match(r"@(coach|awa|cliente|note):\s*(.+)$", line)
        if m:
            buf.append(row(m.group(1), SIDE.get(m.group(1), "left"), m.group(2)))
            continue
        if buf:
            out.append('<div class="bd">' + "".join(buf) + "</div>")
            buf = []
        out.append(line)
    if buf:
        out.append('<div class="bd">' + "".join(buf) + "</div>")
    src = "\n".join(out)
    src = re.sub(r"\{\{row:(\w+):(\w+):(.+?)\}\}", lambda m: row(m.group(1), m.group(2), m.group(3)), src)
    src = re.sub(r"\{\{char:(\w+)\}\}", lambda m: f'<img class="cast" src="{char_src(m.group(1))}" alt="{NAMES[m.group(1)]}">', src)
    src = re.sub(r"\{\{inc:([\w-]+)\}\}", lambda m: (BUILD / "snippets" / f"{m.group(1)}.html").read_text(encoding="utf-8"), src)
    return src


def main():
    src = preprocess((HERE / "court.md").read_text(encoding="utf-8"))
    n_sections = src.count('<section class="pg')
    body = markdown.markdown(src, extensions=["tables", "md_in_html", "sane_lists", "nl2br"])
    css = (BUILD / "style.css").read_text(encoding="utf-8") + (HERE / "court.css").read_text(encoding="utf-8")
    html = BUILD / "_court.html"
    html.write_text(f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>« C\'est combien ? » — version express</title>'
                    f"<style>{css}</style></head><body>{body}</body></html>", encoding="utf-8")
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        p = b.new_page()
        p.goto(html.as_uri()); p.wait_for_load_state("networkidle"); p.evaluate("document.fonts.ready")
        over = p.evaluate("""() => [...document.querySelectorAll('section.pg')].map((s,i)=>[i+1, s.scrollHeight - s.clientHeight]).filter(x=>x[1]>1)""")
        p.pdf(path=str(OUT), prefer_css_page_size=True, print_background=True)
        b.close()
    pages = len(PdfReader(str(OUT)).pages)
    print(f"{OUT.name} : {pages} pages pour {n_sections} sections")
    if over:
        print("Pages qui débordent (n°, px) :", over)


if __name__ == "__main__":
    main()
