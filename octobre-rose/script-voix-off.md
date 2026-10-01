# Octobre Rose — Vidéo de sensibilisation et d'accompagnement (1 min)

**Format :** vertical 1080 × 1920 (statut WhatsApp, Reels, TikTok, Facebook) · 30 i/s · durée exacte **1:00**
**Fichier vidéo :** `octobre-rose-amadou-traore.mp4`, avec musique originale et effets sonores déjà mixés
**Style :** fonds blancs et roses, police Poppins, ruban rose animé
**Structure :** 32 secondes de sensibilisation, puis 28 secondes pour présenter ton accompagnement

---

## Script voix off, calé sur la vidéo

| Temps | Voix off (à dire) | À l'écran |
|---|---|---|
| **0:00 – 0:04** | « Octobre, c'est le mois rose. » | Le ruban rose se dessine, « OCTOBRE » apparaît |
| **0:04 – 0:12** | « Chaque année, le monde se mobilise pour sensibiliser au cancer du sein. » | Fond rose, des rubans apparaissent un par un |
| **0:12 – 0:22** | « C'est le premier cancer chez la femme : 2,3 millions de nouveaux cas en 2022 dans le monde. Mais détecté tôt, il se soigne mieux. » | « 1er cancer chez la femme », compteur 0 → 2,3 millions, encadré « Détecté tôt » |
| **0:22 – 0:32** | « Alors parlons-en : connais ton corps, consulte au moindre doute, fais-toi dépister. Un geste simple peut sauver une vie. » | Les 3 bons réflexes (0:24 · 0:25,5 · 0:27) |
| **0:32 – 0:40** | « Et toi, tu as un projet pour Octobre Rose ? Une campagne, une marche, une journée de dépistage, une conférence ? » | Fond rose, toi au centre, les 4 étiquettes |
| **0:40 – 0:52** | « Je t'accompagne : communication de campagne, visuels et contenus, couverture vidéo de tes événements et gestion de tes réseaux sociaux. Pour que ton message touche le plus de monde. » | Les 4 services (0:42 · 0:44 · 0:46 · 0:48) |
| **0:52 – 1:00** | « Moi, c'est Amadou Traoré. Écris-moi en privé, et ensemble, faisons rayonner ton projet en rose ! » | AMADOU / TRAORÉ, #OctobreRose, bouton « Écris-moi en privé » |

**Les chiffres :** 2,3 millions de nouveaux cas et 670 000 décès dans le monde en 2022. C'est le premier cancer chez la femme dans 157 pays sur 185. Source : CIRC, l'agence spécialisée de l'OMS sur le cancer (février 2024).

---

## Légende proposée pour la publication

> 🎀 **Octobre Rose** 🎀
>
> Octobre, c'est le mois de sensibilisation au cancer du sein. Détecté tôt, il se soigne mieux : connais ton corps, consulte au moindre doute, fais-toi dépister. Et parles-en autour de toi.
>
> 👉 Tu as un projet pour Octobre Rose : une campagne, une marche, une journée de dépistage ou une conférence ? Je t'accompagne : communication de campagne, visuels et contenus, couverture vidéo et gestion des réseaux sociaux.
>
> 📩 Écris-moi en privé pour qu'on en parle.
>
> #OctobreRose #CancerDuSein #Dépistage #Sensibilisation #CommunicationDigitale

---

## La musique et les effets

- **Musique originale** à 120 BPM : intro douce au piano, pulsation légère sur la sensibilisation, puis la musique repart sur « Et toi ? » (0:32), au moment où la vidéo présente ton offre.
- **Effets synchronisés :**
  - « whoosh » à chaque transition ;
  - le ruban qui se dessine ;
  - un tic à chaque palier du compteur ;
  - des « pop » sur les cartes et les étiquettes ;
  - un déclencheur photo sur « Couverture vidéo » ;
  - un scintillement sur « Détecté tôt » et sur « Un geste simple peut sauver une vie ».
- **Pistes séparées :** `octobre-rose-musique.m4a` et `octobre-rose-effets-sonores.m4a`, pour baisser seulement la musique sous ta voix dans CapCut.

---

## Modifier ou régénérer

- **Aperçu :** lance `python -m http.server` dans ce dossier, puis ouvre `index.html`.
- **Textes et timings :** tout se modifie dans `index.html`, section `TIMELINE`.
- **Son :** `python audio.py .` recrée la musique et les effets à partir de `cues.json`.
- **Images :** `FFMPEG=$(which ffmpeg) node render.js 0 1800 video.mp4` rend les 1 800 images (60 s à 30 i/s).
