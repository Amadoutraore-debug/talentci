# Octobre Rose — Vidéo DEO-CI (motion design, 1 min)

**Format :** horizontal 1920 × 1080 (16:9 : Facebook, YouTube, LinkedIn, écrans d'événement) · 30 i/s · durée exacte **1:00**
**Fichier vidéo :** `octobre-rose-deo-ci-16x9.mp4`, avec musique originale et effets sonores déjà mixés
**Signature :** DEO-CI, pas de nom personnel. Contact affiché : Facebook : DEO-CI
**Rendu :** motion blur réel. Chaque image est la moyenne de 8 sous-images (obturateur à 180°), comme une caméra.

---

## Déroulé motion design

| Temps | Animation |
|---|---|
| 0:00 – 0:04 | Un point rose dessine le ruban, puis « OCTOBRE » arrive lettre par lettre. La caméra plonge **à travers le ruban** jusqu'à ce que le rose remplisse l'écran. |
| 0:04 – 0:12 | Des rubans blancs **gravitent en 3D** autour du message et accélèrent sur « cancer du sein ». Un cercle blanc s'ouvre vers la scène suivante. |
| 0:12 – 0:22 | « 1er cancer chez la femme » se réduit en étiquette. Compteur **à rouleaux** 0 → 2,3 millions. Un panneau rose glisse avec « Détecté tôt, il se soigne mieux ». |
| 0:22 – 0:32 | **Poussée latérale** vers une ligne qui se trace pendant que la caméra se déplace. Les 3 bons réflexes surgissent sur la ligne. Le 3e cercle grossit jusqu'à remplir l'écran. |
| 0:32 – 0:40 | « Vous avez un projet pour Octobre Rose ? » avec parallaxe (toi, le cercle blanc, l'anneau qui tourne). Les étiquettes flottent. Tu sors, puis le cercle blanc envahit l'écran. |
| 0:40 – 0:52 | Le logo DEO-CI se construit, « vous accompagne », puis les 4 services en cartes. Ondes de diffusion sur « le plus de monde ». |
| 0:52 – 1:00 | Les cartes s'envolent et le **logo voyage jusqu'au centre**. Slogan des services, contact Facebook, #OctobreRose, fondu au blanc. |

---

## Script voix off (au nom de DEO-CI)

| Temps | Voix off |
|---|---|
| **0:00 – 0:04** | « Octobre, c'est le mois rose. » |
| **0:04 – 0:12** | « Chaque année, le monde se mobilise pour sensibiliser au cancer du sein. » |
| **0:12 – 0:22** | « C'est le premier cancer chez la femme : 2,3 millions de nouveaux cas en 2022 dans le monde. Mais détecté tôt, il se soigne mieux. » |
| **0:22 – 0:32** | « Alors parlons-en : connaître son corps, consulter au moindre doute, se faire dépister. Un geste simple peut sauver une vie. » |
| **0:32 – 0:40** | « Vous avez un projet pour Octobre Rose ? Une campagne, une marche, une journée de dépistage, une conférence ? » |
| **0:40 – 0:52** | « DEO-CI vous accompagne : communication de campagne, visuels et contenus, couverture vidéo de vos événements et gestion de vos réseaux sociaux. Pour que votre message touche le plus de monde. » |
| **0:52 – 1:00** | « DEO-CI. Écrivez-nous sur notre page Facebook, et ensemble, faisons rayonner votre projet en rose. » |

**Les chiffres :** 2,3 millions de nouveaux cas et 670 000 décès dans le monde en 2022. C'est le premier cancer chez la femme dans 157 pays sur 185. Source : CIRC, l'agence de l'OMS spécialisée sur le cancer (février 2024).

---

## Légende proposée pour la publication

> 🎀 **Octobre Rose** 🎀
>
> Octobre est le mois de sensibilisation au cancer du sein. Détecté tôt, il se soigne mieux : connaître son corps, consulter au moindre doute, se faire dépister.
>
> 👉 Vous portez un projet pour Octobre Rose : une campagne, une marche, une journée de dépistage ou une conférence ? **DEO-CI** vous accompagne : communication de campagne, visuels et contenus, couverture vidéo et gestion de vos réseaux sociaux.
>
> 📩 Écrivez-nous sur notre page Facebook **DEO-CI**.
>
> #OctobreRose #CancerDuSein #Dépistage #Sensibilisation #DEOCI

---

## Notes

- **Photo :** le logo BP et le prénom brodé « Nowak » ont été effacés du polo, pour qu'aucune autre marque n'apparaisse dans une publicité DEO-CI.
- **Logo :** le logo DEO-CI de la vidéo est une composition typographique (Poppins avec ruban rose). Si DEO-CI a un vrai logo, il peut le remplacer.
- **Pistes séparées :** `octobre-rose-deo-ci-musique.m4a` et `octobre-rose-deo-ci-effets-sonores.m4a`, pour mixer une voix off dans CapCut.

## Modifier ou régénérer

- **Aperçu :** lance `python -m http.server` dans ce dossier, puis ouvre `index.html`.
- **Son :** `python audio.py .` à partir de `cues.json`. Les effets suivent les `sfx(temps, type)` déclarés dans la timeline.
- **Images avec motion blur :** `FFMPEG=$(which ffmpeg) node render.js 0 1800 video.mp4`, soit 1 800 images × 8 sous-images.
