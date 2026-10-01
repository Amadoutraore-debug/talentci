"""Convertit en PDF les documents d'accompagnement (stratégie, rapport, cahier),
les scripts et prompts (bonus) et une version imprimable du tableau de suivi.

Usage : python3 build/docs_pdf.py   (depuis le dossier ebook-cest-combien)
"""
import re
from pathlib import Path

import markdown
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BUILD, MS, LIV = ROOT / "build", ROOT / "manuscrit", ROOT / "livrables"
BONUS = LIV / "bonus"

DOC_CSS = """
@page{ size:A4; margin:17mm 16mm 18mm;
  @bottom-left{ content:"%(foot)s"; font-family:"Inter"; font-size:7.5pt; color:#8a9893; }
  @bottom-right{ content:counter(page); font-family:"Inter"; font-size:8pt; font-weight:600; color:#0E5A47; } }
body{ font-size:10pt; }
h1{ font-size:22pt; font-weight:800; margin:0 0 4mm; }
.doc-head{ border-bottom:3px solid var(--orange); padding-bottom:4mm; margin-bottom:6mm; }
.doc-head .brand{ font-weight:800; letter-spacing:.28em; color:var(--orange); font-size:8.5pt; margin:0 0 3mm; }
h2{ font-size:14pt; margin-top:1.4em; break-before:auto; }
h3{ font-size:12pt; color:var(--green); }
h4{ font-size:10.5pt; color:var(--green); }
blockquote{ margin:.5em 0 .9em; padding:2.5mm 4mm; background:var(--cream); border-left:4px solid var(--orange); border-radius:5px; break-inside:avoid; }
blockquote p{ margin:0 0 .35em; }
hr{ border:none; border-top:1px solid var(--line); margin:1.2em 0; }
table{ font-size:8.8pt; }
code,pre{ font-family:"DejaVu Sans Mono",monospace; font-size:8.5pt; background:#F2F5F4; border-radius:4px; }
pre{ padding:3mm; white-space:pre-wrap; }
li input[type=checkbox]{ margin-right:4px; }
"""

GRID_CSS = """
@page{ size:A4 landscape; margin:12mm;
  @bottom-left{ content:"Tableau de suivi imprimable · « C'est combien ? » · DÉO-CI"; font-family:"Inter"; font-size:7pt; color:#8a9893; }
  @bottom-right{ content:counter(page); font-family:"Inter"; font-size:8pt; color:#0E5A47; } }
.sheet{ break-after:page; }
.sheet h1{ font-size:16pt; margin:0 0 1mm; }
.sheet p{ font-size:8.5pt; color:var(--muted); margin:0 0 3mm; }
.sheet table{ font-size:7.6pt; }
.sheet td{ height:8.6mm; border:1px solid var(--line); background:#fff !important; }
"""


def page_html(body, css_extra, title):
    css = (BUILD / "style.css").read_text(encoding="utf-8")
    return f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{title}</title><style>{css}\n{css_extra}</style></head><body>{body}</body></html>'


def render(pages):
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        p = b.new_page()
        for html, out in pages:
            tmp = BUILD / ("_" + out.stem + ".html")
            tmp.parent.mkdir(exist_ok=True)
            tmp.write_text(html, encoding="utf-8")
            p.goto(tmp.as_uri()); p.wait_for_load_state("networkidle"); p.evaluate("document.fonts.ready")
            p.pdf(path=str(out), prefer_css_page_size=True, print_background=True)
            print("OK", out.relative_to(ROOT))
        b.close()


def md_doc(md_path, foot):
    src = md_path.read_text(encoding="utf-8")
    src = src.replace("[ ]", "☐")
    first, rest = src.split("\n", 1)
    head = f'<div class="doc-head"><p class="brand">DÉO-CI · « C\'EST COMBIEN ? »</p><h1>{first.lstrip("# ").strip()}</h1></div>'
    body = head + markdown.markdown(rest, extensions=["tables", "sane_lists", "fenced_code"])
    css = (DOC_CSS % {"foot": foot}).replace("../fonts", "fonts")
    return page_html(body, css, first.lstrip("# "))


def raw_blocks(src, cls):
    res = []
    for m in re.finditer(rf'<div class="{cls}"[^>]*>', src):
        depth, i = 1, m.end()
        while depth:
            o, c = src.find("<div", i), src.find("</div>", i)
            if o != -1 and o < c:
                depth, i = depth + 1, o + 4
            else:
                depth, i = depth - 1, c + 6
        res.append(src[m.start():i])
    return res


def collection(cls, title, intro):
    parts = [f'<div class="doc-head"><p class="brand">DÉO-CI · BONUS DU LIVRE « C\'EST COMBIEN ? »</p><h1>{title}</h1></div>\n\n<p>{intro}</p>']
    for i in range(1, 13):
        src = (MS / f"ch{i:02d}.md").read_text(encoding="utf-8")
        blocks = raw_blocks(src, cls)
        if not blocks:
            continue
        num = re.search(r'<p class="chap-num">(Chapitre \d+)', src).group(1)
        name = re.search(r'<h1 class="chap">(.*?)</h1>', src).group(1)
        parts.append(f"<h2>{num} · {name}</h2>")
        parts.extend(blocks)
    body = markdown.markdown("\n\n".join(parts), extensions=["tables", "md_in_html", "sane_lists", "nl2br"])
    css = DOC_CSS % {"foot": f"{title} · « C'est combien ? » · DÉO-CI"}
    return page_html(body, css, title)


SHEETS = [
    ("Suivi des commandes", "Une ligne par commande. Notez-la le jour même, pendant votre moment du soir (chapitre 12).",
     ["Date", "Client (nom enregistré)", "Produit", "Qté", "Prix", "Livraison", "Total", "Zone", "Paiement", "Statut paiement", "Statut livraison", "Remarque"], 16),
    ("Demandes et relances", "Une ligne par demande de prix. Cochez les relances envoyées (chapitre 10).",
     ["Date", "Client", "Produit demandé", "Étiquette", "Réponse 3 temps ✓", "Objection", "J+1 ✓", "J+3 ✓", "J+7 ✓", "Résultat", "Remarque"], 16),
    ("Bilan hebdomadaire", "Quatre chiffres chaque semaine, une décision (chapitre 12).",
     ["Semaine du", "Vues moyennes", "Demandes", "Commandes", "Commandes ÷ demandes", "Clients revenus", "Ce qui a marché", "Étape qui fuit", "Amélioration de la semaine suivante"], 13),
    ("Clients fidèles", "Achats, préférences et avantages dus (chapitre 11). Ne notez que ce que le client vous a dit lui-même.",
     ["Client", "Téléphone", "Commune", "Nb d'achats", "Dernier achat", "Préférences", "Avantage dû", "Accord diffusion", "Parrainé par"], 16),
    ("Mes objections", "Chaque objection répétée révèle un point à améliorer dans votre offre (chapitre 8).",
     ["Objection", "Nb de fois", "Réponse rapide", "Preuve à envoyer", "Option alternative", "Ce que ça révèle sur mon offre"], 14),
]


def grids():
    body = []
    for title, note, cols, rows in SHEETS:
        th = "".join(f"<th>{c}</th>" for c in cols)
        tr = ("<tr>" + "<td></td>" * len(cols) + "</tr>") * rows
        body.append(f'<div class="sheet"><h1>{title}</h1><p>{note}</p><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>')
    return page_html("".join(body), GRID_CSS, "Tableau de suivi imprimable")


if __name__ == "__main__":
    pages = [
        (md_doc(LIV / "Strategie-commerciale_C-est-combien.md", "Stratégie commerciale · « C'est combien ? » · DÉO-CI"), LIV / "Strategie-commerciale_C-est-combien.pdf"),
        (md_doc(LIV / "Rapport-qualite_et_A-faire.md", "Rapport qualité · « C'est combien ? » · DÉO-CI"), LIV / "Rapport-qualite_et_A-faire.pdf"),
        (md_doc(LIV / "Cahier-des-illustrations.md", "Cahier des illustrations · « C'est combien ? » · DÉO-CI"), LIV / "Cahier-des-illustrations.pdf"),
        (collection("script", "Les scripts à copier", "Tous les messages du livre, classés par chapitre. Remplacez ce qui est entre [crochets], puis personnalisez toujours avant d'envoyer."), BONUS / "Scripts-a-copier_C-est-combien.pdf"),
        (collection("prompt", "Les prompts IA", "La fiche de contexte et tous les prompts du livre. Collez d'abord votre fiche de contexte (chapitre 6), puis le prompt. Relisez toujours la réponse de l'IA avant de l'utiliser."), BONUS / "Prompts-IA_C-est-combien.pdf"),
        (grids(), BONUS / "Tableau-de-suivi-imprimable_C-est-combien.pdf"),
    ]
    render(pages)
