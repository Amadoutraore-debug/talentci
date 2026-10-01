# Rapport qualité

*Étapes 6, 7 et 17 du projet : relecture éditoriale, correction du style, contrôle qualité.*

---

## 1. Ce que la relecture a corrigé

| Problème repéré | Correction appliquée |
|---|---|
| Le livre dépassait l'estimation initiale (70-80 pages) | **Option A retenue :** tout reste dans le livre (115 pages A5), parce que les scripts et les prompts font sa valeur et que les lecteurs sur téléphone veulent tout au même endroit. Les bonus reprennent ces outils dans des formats pratiques (texte à copier, Excel, kit imprimable), sans contenu inventé pour gonfler. |
| Doublon entre le prompt « légende produit » (ch. 6) et le prompt « fiche produit » (ch. 3) | Remplacé par un prompt de script vidéo (ch. 6) |
| Doublon « le silence » (ch. 8) avec les relances (ch. 10) | Remplacé par l'objection « je vais demander à mon mari / ma sœur / mon patron » |
| Mentions « cas fictif » trop longues et répétées | Une seule mention courte en italique par cas, et une déclaration claire dans l'avertissement et l'introduction |
| Notes de travail (sources, illustrations) au milieu des chapitres | Sources ramenées à une ligne discrète au bon endroit, plus une page « Sources à consulter » en fin de livre ; consignes d'illustration déplacées dans le cahier des illustrations |
| Rubrique « Comment utiliser ce livre » prévue en double (page à part et introduction) | Gardée uniquement dans l'introduction |
| La loi ivoirienne sur les données citée sans vérification (ch. 4) | Formulation générale, sans numéro de loi : « les données personnelles sont protégées par la loi en Côte d'Ivoire » |
| Risque de lire les conseils comme des faits | Encadrés « Mon avis » systématiques, et un encadré final qui liste ce qui relève de l'avis de l'auteur |
| Style : débuts de phrase répétitifs, formules d'IA | Relecture complète. Aucun « Dans le monde actuel », « À l'ère du numérique », « Il est important de », « N'hésitez pas » dans le texte du livre ; ces formules n'apparaissent que comme exemples de tics à éviter (ch. 6). |
| Le chapitre 12 n'existait pas | Rédigé : routine en 3 moments, suivi des commandes, bilan en 4 chiffres, cas de Serge, signes pour aller plus loin |

---

## 2. Le contrôle qualité (section 17 du cahier des charges)

| Question | Réponse |
|---|---|
| **Le contenu est-il réellement utile ?** | Oui. Chaque chapitre se termine par un outil applicable le jour même (script, modèle, checklist, prompt). Le diagnostic du chapitre 1 évite au lecteur de lire ce qui ne le concerne pas. |
| **Les informations sont-elles cohérentes ?** | Oui. Les étiquettes (5 couleurs), le calendrier de relance, les numéros de scripts et les renvois entre chapitres ont été vérifiés. Les faits techniques s'appuient sur l'aide officielle de WhatsApp. |
| **Y a-t-il des répétitions ?** | Les répétitions restantes sont volontaires : des rappels courts (« prix, valeur, question », les 5 étapes) qui servent de repères. Les deux doublons de contenu ont été supprimés (voir ci-dessus). |
| **Le livre apporte-t-il une transformation concrète ?** | Oui : d'un WhatsApp improvisé à un système (profil, offre, statuts planifiés, réponses types, relances, paiement sécurisé, fidélisation, bilan), guidé par le plan de 30 jours. |
| **Les exemples sont-ils réalistes ?** | Oui : 4 personnages ivoiriens, des situations locales (communes d'Abidjan, Bouaké, Daloa, paiement mobile, livreurs, cars). Les montants sont des exemples entre crochets à ajuster. |
| **Le français est-il naturel ?** | Oui : vouvoiement, phrases courtes, dialogues réalistes sans nouchi forcé. **À faire :** une relecture orthographique par une deuxième personne, indispensable pour tout livre vendu. |
| **Les exercices sont-ils applicables ?** | Oui : grilles à remplir, jeux de rôle, mesures simples, tous réalisables avec un téléphone. |
| **Les bonus sont-ils utiles ?** | Oui : ils reprennent les outils dans des formats pratiques. Les modèles Canva (bonus 5) restent à créer. |
| **Le prix correspond-il à la valeur ?** | 7 500 FCFA (4 900 au lancement) pour 115 pages et 4 bonus : le prix est cohérent et accessible. L'argument « une vente sauvée rembourse le livre » est honnête. |
| **Le livre ressemble-t-il à un vrai produit commercial ?** | Oui : couverture, pages légales, sommaire paginé, mise en page professionnelle, schémas, encadrés, plan d'action, page auteur. |
| **Qu'est-ce qui pourrait faire hésiter un acheteur ?** | (1) « Je trouve ça gratuitement » → positionnement « boîte à outils + méthode + local ». (2) L'absence d'avis → lecteurs bêta avant le lancement. (3) La crédibilité de l'auteur → compléter la page auteur avec des réalisations vérifiables. (4) La peur de la technologie → insister sur « si vous savez envoyer un message, vous pouvez l'appliquer ». |
| **Qu'est-ce qui pourrait être amélioré ?** | Vos anecdotes réelles dans les « conseils du pro » (c'est le plus important) ; de vraies captures d'écran annotées ; une version audio ou vidéo de quelques chapitres ; une mise à jour annuelle quand WhatsApp change ses fonctions. |

---

## 3. Version finale

À votre demande, toutes les parties à compléter ont été retirées : anecdotes personnelles, coordonnées, mois de publication, emplacements d'avis clients. **Le livre est prêt à vendre tel quel.** Les « conseils du pro » restent, sous forme de conseils professionnels généraux.

### Facultatif, si vous le souhaitez un jour

- Faire relire l'orthographe par une deuxième personne.
- Vérifier dans l'application, de temps en temps, que les noms des menus WhatsApp n'ont pas changé, et mettre à jour le livre si besoin.
- Créer les modèles Canva décrits dans le cahier des illustrations (bonus 5).
- Collecter de vrais avis de lecteurs, avec leur accord, pour votre page de vente.

### Pour modifier le livre

Le texte se trouve dans `manuscrit/` (un fichier par chapitre). Pour régénérer le PDF et les bonus :

```
pip install markdown pypdf playwright openpyxl
python3 build/build.py      # le livre
python3 build/bonus.py      # les bonus
```
