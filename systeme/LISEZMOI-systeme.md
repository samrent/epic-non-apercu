# EPIC-NON system — phase 1: measured flyer

Same method as the sizzle recreation (measured tokens → named primitives → declarative data → renderers), applied to EPIC-NON. No Saatchi brand asset is reused: only the method and the motion grammar.

```
data/tokens.json   palette, 8 segment colours (with the reason for each), type scale, A5 grid in mm, timing + easing
data/points.json   the library: 12 points, each = title, essential line, two-sided comparison, source, segments;
                   per segment: recto hook, reel word, point order (first = hero)
lib/data.js        loads + resolves a segment; lists facts still marked tbc
lib/motion.js      cubic-bezier easing, read-hold rule, velocity blur, text wrap
flyer/print.html   A5 recto/verso on the 6-col grid; ?segment=<id> or ?all=1; ?format=a4; ?style=couleur; print → PDF
flyer/motion.html  1080×1920, 24 fps; reel → hook → comparison → point → call to act → closer; export WebM
out/               exported proofs and PDF
```

Run: `python3 -m http.server 8738` in this folder, open http://localhost:8738/.

## Rules carried over from the method

- Holds dominate, moves are short (arrive 5 f, whip 3 f). Hold length comes from the text: 6 frames per word, floor 24 — legible for a broad public.
- Speed is drawn as blur; stepped scale on holds, never tweened.
- Cuts hide inside motion (the point whips out, the call to act cuts in on the move).

## Segment colour logic

Each segment colour borrows an association the audience already holds (navy for trust and medicine, scrubs teal for care staff, federal red for sovereignty, slate and amber for public money, violet of the feminist strike for equality, electric blue for youth, terminal black and green for IT, Vaud green for the regions). Associative only: no party logo, slogan or exact party colour.

## Print: three formats

The default flyer is **ink-light**, so anyone can print it at home: white paper, black text, no background fills,
no bleed, everything at least 8 mm inside the trim (home printers cannot print the last ~5 mm). The segment colour
only marks a 3 mm square next to the segment label and one thin rule over « Ce que nous demandons »; every piece of
information is also carried by text, weight or position, so it reads the same in black & white.
Measured ink coverage: about 7–8 % of each side (mean density of the PNG), against ~45–50 % for the colour recto.

| Format | File (per segment, in `out/<segment>/`) | Page | URL |
|---|---|---|---|
| Flyer A5 à imprimer chez soi (default) | `epic-non-<seg>-A5.pdf`, 2 pages | A5 148 × 210 mm, no bleed | `flyer/print.html?segment=<seg>` |
| 2 flyers par feuille A4, à couper | `epic-non-<seg>-A4-2par-feuille.pdf`, 2 pages | A4 landscape 297 × 210 mm | `…&format=a4` |
| Version couleur pour imprimeur | `epic-non-<seg>-A5-couleur-imprimeur.pdf`, 2 pages | 154 × 216 mm = A5 + 3 mm bleed | `…&style=couleur` |

- PNG previews: `epic-non-<seg>-recto.png` / `-verso.png` (ink-light, ~290 dpi) and `-couleur-recto.png` / `-couleur-verso.png`.
- All segments in one file: `out/epic-non-flyers-A5-tous.pdf`, `out/epic-non-flyers-A4-2par-feuille-tous.pdf`,
  `out/epic-non-flyers-A5-couleur-imprimeur-tous.pdf`.
- `out/manifest.json`: per segment `pdf`, `recto`, `verso` are the ink-light files (read by the studio and the preview
  publisher); `a4`, `couleur`, `rectoCouleur`, `versoCouleur` and `kit` are the other files.

How to print at home:
- **A5 PDF**: print at 100 % (« taille réelle », not « ajuster à la page »), recto-verso. On A5 paper directly, or on A4
  if the printer centres it (then cut).
- **A4, 2 par feuille**: ordinary A4 paper, landscape, 100 %, recto-verso **retourné sur le bord court**. Page 1 holds two
  identical rectos, page 2 the two versos; because both halves carry the same flyer, each verso lands behind a recto.
  Without duplex: print page 1, put the sheet back in the tray, print page 2. Cut along the dashed line in the middle.
- **Couleur**: for a print shop only (solid colour areas, 3 mm bleed). The PDF is RGB; if the shop asks for CMYK, ask
  them to convert it, or to print it digitally as it is.

Regenerate everything with `./build.sh` (headless Chrome). It also checks that no text runs past the safe area on any
side or format and prints a warning if one does (the page sets `data-overflow` on `<body>`; the print toolbar shows
« Texte trop long » too). A headline longer than four lines shrinks automatically, down to 26 pt.

Manual export: Imprimer / PDF in the toolbar of `flyer/print.html` (choose the format there), or headless Chrome:
`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --virtual-time-budget=10000 --print-to-pdf=out/flyers.pdf "http://localhost:8738/flyer/print.html?all=1"`

The QR codes point to `https://epic-non.ch/?s=<segment>#signer`. The static site ignores `?s=`, so the code works today,
and the server logs can count scans per segment without any tracking.

### Notes de mise en page (version peu d'encre)
- Recto : accroche, puis le point n° 1 du public (titre, phrase essentielle, comparaison, source), puis la liste « Au verso, 3 autres points » (n° 2 à 4) et le pied (délai, epic-non.ch). Le verso reprend les points 2 à 4.
- Le côté droit d'une comparaison n'est mis en gras (et souligné de la couleur du public) que lorsqu'il exprime la position du comité ; une comparaison neutre (ex. « Ailleurs, Epic a déçu ») garde deux colonnes égales.
- Typographie appliquée à l'affichage, sans modifier `points.json` : apostrophe typographique, chiffre et mot insécables (« 11 établissements »), mots composés non coupés, « 1er » en exposant.
- QR : 30 mm, noir sur blanc, avec la zone blanche de 4 modules exigée par la norme. Si la bibliothèque QR (cdnjs) ne se charge pas, un cadre « QR manquant » s'affiche et `build.sh` le signale.
