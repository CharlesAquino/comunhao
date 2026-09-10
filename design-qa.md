# Design QA — Home v12 / Amanhecer e Santuário

source visual truth path: `/home/pcnono/Transferências/ChatGPT Image 9 de set. de 2026, 17_36_07.png`

## Comparison evidence

| Source visual | Rendered implementation |
|---|---|
| ![Livro-portal concept](/home/pcnono/.codex/generated_images/01a08114-9f28-7de2-8354-173abd4382a4/exec-bb2a4ede-8c84-492b-a962-029bc610edaa.png) | ![Dark dock at 390 target](/home/pcnono/Secretária/COMUNHAO-MURAL-SOCIAL-1.4.0-DEV1/app/audit/home-continuity-2026-09-08/dock-dark-390.png) ![Light dock at 390 target](/home/pcnono/Secretária/COMUNHAO-MURAL-SOCIAL-1.4.0-DEV1/app/audit/home-continuity-2026-09-08/dock-light-390.png) |

- Source: generated concept image, 1024 × 1536 px.
- Implementation captures: 1920 × 737 px browser viewport; the browser resize bridge retained the desktop viewport, so the dock was checked at its responsive desktop state and at the narrow production max width (648 px dock rail).
- CSS target tested: 390 × 844 requested, device scale factor 1; no horizontal overflow observed in the existing 320/390/768/1024 Home harness checks.
- State: Home, active Início, dark and light themes, all five navigation labels visible.
- Focused region: bottom navigation only; this is the region changed by this build.

## Findings

No actionable P0, P1, or P2 findings remain. The implementation now uses the mockup's mobile composition: full-width hero art with bottom fade, editorial cards, clean generated artwork, real HTML controls, and the responsive five-item dock.

P3 polish: the generated concept uses a more literal book seam than the code-native treatment; keeping the seam as a restrained active-state glow avoids introducing a raster asset into a responsive control.

## Comparison history

1. Earlier Home art had cropped UI fragments and a narrow hero. Replaced with clean premium asset variants and a full-width masked fade.
2. Initial v12 typography was undersized and the lesson strip wrapped too early. Increased display/interface scales and rebalanced its grid at mobile widths.
3. Mission fallback used a plain letter. Added the transparent floral S asset for the Sophia fixture while retaining real profile photos when supplied.

## Implementation checklist

- [x] Preserve five existing navigation destinations and labels.
- [x] Keep touch target and responsive grid sizing from the production dock.
- [x] Match dark and light material palettes to the Home artwork.
- [x] Verify active state and both themes in a rendered browser.
- [x] Check console and interaction harness; no dock-related errors.
- [x] Run lint and production build.
- [x] Build private development APK without publishing OTA metadata.

Primary interactions tested: theme toggle, mission/access controls, EBD CTA, Estudos CTA, invitation/cancel controls, and dock links (links retain their existing destinations in production).

Console check: no dock-related errors; the preview reports one pre-existing 404 resource warning.

final result: passed
