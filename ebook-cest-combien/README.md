# « C'est combien ? » — ebook DÉO-CI

La méthode pour transformer vos discussions WhatsApp en ventes. Par Amadou Traoré.

## Livrables (`livrables/`)

| Fichier | Contenu |
|---|---|
| `C-est-combien_Amadou-Traore_DEO-CI.pdf` | Le livre mis en page, prêt à vendre après personnalisation (115 pages A5) |
| `bonus/Scripts-a-copier_C-est-combien.txt` | Bonus 1 : tous les scripts, à copier-coller |
| `bonus/Prompts-IA_C-est-combien.txt` | Bonus 2 : la fiche de contexte et les prompts IA |
| `bonus/Tableau-de-suivi_C-est-combien.xlsx` | Bonus 3 : commandes, relances, bilan hebdo, clients fidèles, objections |
| `bonus/Kit-imprimable_C-est-combien.pdf` | Bonus 4 : checklists, grilles, calendrier et plan de 30 jours |
| `Strategie-commerciale_C-est-combien.md` | Prix, positionnement, page de vente, publications, scripts publicitaires, plan de lancement |
| `Rapport-qualite_et_A-faire.md` | Contrôle qualité et liste de ce qu'il reste à faire avant de vendre |
| `Cahier-des-illustrations.md` | Charte visuelle, schémas, prompts d'images, modèles Canva à créer |

## Modifier et régénérer

Le texte est dans `manuscrit/` (Markdown, un fichier par chapitre). La mise en page est dans `build/` (`style.css`, `cover.html`, `snippets/`).

```
pip install markdown pypdf playwright openpyxl
python3 build/build.py    # régénère le livre
python3 build/bonus.py    # régénère les bonus
```

Chromium est attendu dans `/opt/pw-browsers/chromium` (ou dans la variable d'environnement `CHROME`).
