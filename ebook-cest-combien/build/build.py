"""Construit le PDF de l'ebook « C'est combien ? » à partir du manuscrit Markdown.

Usage : python3 build/build.py   (depuis le dossier ebook-cest-combien)
Dépendances : pip install markdown pypdf playwright ; Chromium (chemin CHROME ci-dessous).
"""
import io, os, re, sys
from pathlib import Path

import markdown
from pypdf import PdfReader, PdfWriter
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
MS = ROOT / "manuscrit"
OUT = ROOT / "livrables"
CHROME = os.environ.get("CHROME", "/opt/pw-browsers/chromium")

ORDER = ["00-ouverture", "01-introduction"] + [f"ch{i:02d}" for i in range(1, 13)] + ["99-fin"]

# (marqueur, texte, type) — l'ordre est celui du sommaire
TOC = [
    ("mot", "Le mot de l'auteur", "front"),
    ("intro", "Introduction : le client qui demande le prix et disparaît", "front"),
    ("p1", "Partie 1 · Poser les bases", "part"),
    ("ch01", "1|Trouvez où vous perdez vos ventes", "chap"),
    ("ch02", "2|Faites de WhatsApp Business une vraie boutique", "chap"),
    ("ch03", "3|Rendez votre offre claire avant même la question", "chap"),
    ("p2", "Partie 2 · Être vu et donner envie", "part"),
    ("ch04", "4|Faites enregistrer votre numéro", "chap"),
    ("ch05", "5|Publiez des statuts qui font vendre", "chap"),
    ("ch06", "6|Une semaine de statuts en une heure, avec l'IA et Canva", "chap"),
    ("p3", "Partie 3 · Transformer les conversations en ventes", "part"),
    ("ch07", "7|Répondez à « C'est combien ? »", "chap"),
    ("ch08", "8|Les objections : « C'est cher », « Je vais réfléchir »…", "chap"),
    ("ch09", "9|Conclure la commande et sécuriser le paiement", "chap"),
    ("p4", "Partie 4 · Faire revenir et s'organiser", "part"),
    ("ch10", "10|Relancer sans harceler", "chap"),
    ("ch11", "11|Du client unique au client qui revient et recommande", "chap"),
    ("ch12", "12|Organisez votre activité en 30 minutes par jour", "chap"),
    ("fin", "Pour finir", "part"),
    ("conclusion", "Conclusion", "front"),
    ("plan30", "Votre plan d'action de 30 jours", "front"),
    ("boite", "La boîte à outils", "front"),
    ("sources", "Sources à consulter", "front"),
    ("auteur", "À propos de l'auteur et de DÉO-CI", "front"),
]


def toc_html(pages):
    items = []
    for key, text, kind in TOC:
        pg = pages.get(key, "")
        if kind == "part":
            items.append(f'<li class="part"><span class="t">{text}</span></li>')
            continue
        if kind == "chap":
            n, t = text.split("|", 1)
            label = f"<b>{n}.</b> {t}"
        else:
            label = text
        items.append(f'<li class="{kind}"><span class="t">{label}</span><span class="dots"></span><span class="pg">{pg}</span></li>')
    return '<ul class="toc">' + "\n".join(items) + "</ul>"


def assemble(pages):
    parts = []
    for name in ORDER:
        p = MS / f"{name}.md"
        if p.exists():
            parts.append(p.read_text(encoding="utf-8"))
    src = "\n\n".join(parts)
    src = re.sub(r"\{\{inc:([\w-]+)\}\}", lambda m: (BUILD / "snippets" / f"{m.group(1)}.html").read_text(encoding="utf-8"), src)
    src = src.replace("{{TOC}}", toc_html(pages))
    body = markdown.markdown(src, extensions=["tables", "md_in_html", "attr_list", "sane_lists", "nl2br"])
    css = (BUILD / "style.css").read_text(encoding="utf-8")
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>« C'est combien ? »</title>
<style>{css}</style></head><body>{body}</body></html>"""


def render(page, html_path, pdf_path):
    page.goto(html_path.as_uri())
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready")
    page.pdf(path=str(pdf_path), prefer_css_page_size=True, print_background=True)


def find_pages(pdf_path):
    reader = PdfReader(str(pdf_path))
    found = {}
    for i, pg in enumerate(reader.pages, start=1):
        txt = pg.extract_text() or ""
        for m in re.finditer(r"QQ(\w+?)QQ", txt):
            found.setdefault(m.group(1), i)
    return found, len(reader.pages)


def main():
    OUT.mkdir(exist_ok=True)
    tmp = BUILD / "tmp"
    tmp.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME)
        page = browser.new_page()
        pages = {}
        for _ in range(2):  # passe 1 : repérage des pages ; passe 2 : sommaire numéroté
            html = BUILD / "book.html"
            html.write_text(assemble(pages), encoding="utf-8")
            render(page, html, tmp / "body.pdf")
            pages, total = find_pages(tmp / "body.pdf")
        render(page, BUILD / "cover.html", tmp / "cover.pdf")
        browser.close()
    missing = [k for k, _, kind in TOC if kind != "part" and k not in pages]
    if missing:
        print("Marqueurs introuvables :", missing, file=sys.stderr)
    w = PdfWriter()
    for f in ("cover.pdf", "body.pdf"):
        for pg in PdfReader(str(tmp / f)).pages:
            w.add_page(pg)
    w.add_metadata({"/Title": "« C'est combien ? » — La méthode pour transformer vos discussions WhatsApp en ventes",
                    "/Author": "Amadou Traoré — DÉO-CI", "/Subject": "Vendre sur WhatsApp Business"})
    out = OUT / "C-est-combien_Amadou-Traore_DEO-CI.pdf"
    with open(out, "wb") as fh:
        w.write(fh)
    print(f"OK : {out} ({total + 1} pages)")


if __name__ == "__main__":
    main()
