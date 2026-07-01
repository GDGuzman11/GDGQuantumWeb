# Starshell — authored level drop folder

Drop your exported campaign here for Claude to review + bake into the live game.

## How

1. In the game (local `npm run dev`) → menu → **▸ Level Editor**.
2. Build your levels on the timeline, **SAVE** each one.
3. Hit **EXPORT CAMPAIGN** — it downloads `starshell-campaign.json` (and copies a
   paste-ready code block to your clipboard).
4. Move `starshell-campaign.json` into **this folder** (`starshell-levels/`).
5. Tell Claude "the campaign is in starshell-levels/" — it reads the file, bakes the
   layouts into `components/arcade/fps/kit/levels.ts` (`CAMPAIGN`, keyed by authored
   level number), builds, and deploys so real players get them.

## Notes

- Your **local** playthrough already uses your saved levels immediately (read from
  browser localStorage) — the export/bake step is only needed to ship to real players.
- Bosses auto-insert at every 5th campaign slot; your authored levels fill the rest in
  order. `level: 1` in the file = the first non-boss slot, and so on.
- Empty timeline slots fall back to a procedural arena.
