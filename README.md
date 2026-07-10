# News Video Generator

Generate professional **news videos** from simple form input — using only
**deterministic templates and rendering logic**. No AI, no LLM, no external
generative services of any kind. Everything you see is produced by React +
Remotion compositions driven by your data.

## Stack

- **Next.js / React / TypeScript / Tailwind CSS** — app, dashboard, editor
- **Remotion** (`@remotion/player`) — live preview + (Phase 2) MP4 rendering
- **Zustand** — project state, saved library, export queue (localStorage-backed)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run typecheck
```

## Architecture

```
src/
  app/                 Next.js routes (dashboard `/`, editor `/editor`)
  components/
    dashboard/         Dashboard: Create / Saved / Queue / Settings
    editor/            News editor form, media upload, editor shell
    preview/           Remotion Player live preview
    ui/                Shared UI primitives
  remotion/
    NewsComposition    Template dispatcher (shared by preview + renderer)
    Root.tsx           Registered composition for server rendering (Phase 2)
    templates/         Template engine: registry + one file per template
    components/        Reusable overlays (ticker, lower third, logo, bg…)
    animations/        Modular frame-driven animation presets
  lib/                 Store, defaults, formatting, file helpers
  types/               Domain model (NewsProject) — the single source of truth
  hooks/
```

### Adding a template

1. Create `src/remotion/templates/MyTemplate.tsx` exporting a
   `React.FC<TemplateProps>`.
2. Register it in `src/remotion/templates/registry.ts` and add its id to
   `TemplateId` in `src/types/project.ts`.

Nothing else changes — the picker, preview, and renderer resolve templates
through the registry.

## Rendering & export (Phase 2)

Rendering is fully server-side and separated from the UI:

```
src/
  lib/timeline/       buildTimeline — frame-accurate scene/transition engine
  lib/assets/         centralized asset manager (content-hash dedup)
  lib/export/         useExportQueue — client polling hook
  remotion/scenes/    intro / headline / body / outro scene components + registry
  remotion/components/AudioLayer, Background, Ticker, LowerThird, Logo, Watermark
  server/             renderer (bundle+renderMedia), FIFO queue, job registry
  app/api/render/     POST start · GET list · [id] status/cancel/retry · download
```

- **Formats:** MP4 (H.264) and WebM (VP8).
- **Aspect ratios:** 16:9, 9:16, 1:1 at 720p/1080p, 30/60 fps.
- **Scene timeline:** intro → headline → body paragraphs (unlimited) → outro,
  with fade/slide/wipe transitions.
- **Queue:** real states (waiting → preparing → rendering → encoding →
  completed/failed/cancelled), true progress %, elapsed + ETA, cancel & retry.
- **Preview == export:** both mount the identical `<NewsComposition>` fed by the
  same `buildTimeline`, so the MP4 matches the preview pixel-for-pixel.

> First render downloads Remotion's headless-shell (~113 MB) once, then caches
> it. No system FFmpeg needed — Remotion bundles its own compositor.

## Anchor Engine (Phase 3)

A fully modular, **no-AI** virtual-presenter system. Characters are deterministic
parametric SVG rigs; every animation is a pure function of the frame (talking is
a deterministic mouth loop over the narration duration — no lip-sync).

```
src/anchors/
  types.ts              anchor contract (metadata, instance, layers, positions)
  registry/             THE registry — add an anchor = one row here
  animations/           reusable presets: state resolver + entry/exit
  components/           shared AnchorFigure rig, renderer, layer, placement
  factory.ts            build a placed instance from metadata
  male-himachali/ female-himachali/ male-national/ female-national/
  business/ sports/ weather/ youth/        ← isolated anchor packages
```

**Adding an anchor** = new folder (`metadata` + `Character`) + one row in
`registry/index.ts`. **Zero** changes to renderer, editor, timeline.

- **8 anchors** across regional / national / business / sports / weather / digital.
- **Multi-anchor**: unlimited presenters per project (anchor + guest/reporter…).
- **Layers**: background → desk → (scene) → middle → front → overlay.
- **Positions**: bottom-left/right, center-left/right, behind-desk, full-body, custom.
- **Animations** (reusable): idle, talking, blink, smile, head-nod, gesture, wave,
  point, reading, listening, serious, breaking, intro, outro.
- **Timeline objects**: each anchor is scene-scoped and independent, with its own
  entry/exit, per-scene animation (or `auto`: reads headline → talks body → waves
  outro), scale, opacity, shadow, flip, visibility.
- **Performance**: only active anchors are loaded (lazy import + cache + unload of
  unused); one shared rig, no duplicate loading.
- **Future voice**: `resolveAnchorState` is the single seam — swap the deterministic
  mouth loop for phoneme timing without touching rigs, renderer, or timeline.

## Roadmap

- **Phase 1 (done):** architecture, dashboard, editor, live preview, template
  engine, modular animations, ticker, branding.
- **Phase 2 (done):** scene/timeline engine, server-side MP4/WebM export,
  real queue + progress, asset manager, audio system, aspect ratios,
  error handling + retry, full save/load.
- **Phase 3 (done):** modular Anchor Engine — registry-driven virtual presenters,
  8 anchors, multi-anchor, layers, deterministic talking, scene-scoped timeline
  integration, lazy loading. No AI.
- **Next:** more templates, timeline editing UI, phoneme-accurate voice-over,
  parallel export processing.

Future-ready (architecture only): voice-over, multi-scene timelines,
multi-language, custom transitions, stock media, collaboration, cloud
rendering, plugins.
