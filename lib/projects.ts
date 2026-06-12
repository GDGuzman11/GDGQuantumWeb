/**
 * Projects showcase data — the single source of truth for the three terminal
 * cards and their full-screen case studies (see components/sections/projects/).
 *
 * Everything here is PLACEHOLDER content scaffolded for the build. Swap the
 * copy, tags, URLs and snippets for the real projects when ready — the UI reads
 * entirely from this array, so no component edits are needed to update content.
 *
 * MEDIA (optional, auto-upgrading): drop files into `public/projects/` and the
 * case study uses them automatically; until then a graceful gradient/poster
 * placeholder stands in (nothing renders a broken <video>/<img>). Expected
 * paths per project, e.g. for id "neural-engine":
 *   public/projects/neural-engine.webm     → media.video
 *   public/projects/neural-engine-poster.jpg → media.poster
 *   public/projects/neural-engine-01.jpg ... → media.gallery[]
 */

/** Shared monospace "live AI compilation" script the cards loop while idle. */
export const TYPING_SCRIPT: readonly string[] = [
  '[SYSTEM] Initializing LLM context... OK',
  '[AGENT] Querying local repository: /projects/neural-engine',
  '[PROMPT] /synthesize_case_study --depth=full --generate-ui',
  '[STATUS] Injecting structural parameters into canvas...',
];

export interface ProjectBrief {
  /** JSON-log style lines describing what the project set out to do. */
  goals: string[];
  /** JSON-log style lines describing the technical architecture. */
  architecture: string[];
}

export interface ProjectMedia {
  /** Looping product video (mp4/webm) under /public/projects. Optional. */
  video?: string;
  /** Poster frame shown before/without the video. Optional. */
  poster?: string;
  /** Gallery still frames under /public/projects. Optional. */
  gallery?: string[];
}

export interface ProjectSnippet {
  /** Language label shown in the terminal chrome (e.g. "ts", "py"). */
  lang: string;
  /** The code block rendered in the read-only log terminal. */
  code: string;
}

export interface Project {
  /** Stable id; also the media filename stem under /public/projects. */
  id: string;
  /** Human-readable project name shown on the card + case study. */
  name: string;
  /** Machine codename, e.g. "NEURAL-ENGINE". */
  codename: string;
  /** One-line positioning statement. */
  tagline: string;
  /** ML / tech micro-tags (PyTorch, WebGL, …). */
  tags: string[];
  /** Baseline latency (ms) the fake live dashboard jitters around. */
  latencyMs: number;
  brief: ProjectBrief;
  media: ProjectMedia;
  snippet: ProjectSnippet;
  /** External "launch live demo" target. */
  liveUrl: string;
  /** External "inspect source" target. */
  sourceUrl: string;
}

// TODO: replace all placeholder content below with the real projects.
export const projects: Project[] = [
  {
    id: 'neural-engine',
    name: 'Neural Engine',
    codename: 'NEURAL-ENGINE',
    tagline: 'Realtime inference orchestration for on-device language models.',
    tags: ['PyTorch', 'WebGL', 'ONNX', 'Rust'],
    latencyMs: 42,
    brief: {
      goals: [
        '"objective": "sub-50ms local inference with zero cloud round-trips"',
        '"surface": "an interface that feels like thinking out loud"',
        '"constraint": "runs fully offline on consumer hardware"',
      ],
      architecture: [
        '"runtime": "quantized transformer compiled to WASM + WebGPU"',
        '"pipeline": "tokenizer → scheduler → kv-cache → streaming decode"',
        '"frontend": "Next.js shell, GSAP motion, zero layout shift"',
      ],
    },
    media: {
      video: '/projects/neural-engine.webm',
      poster: '/projects/neural-engine-poster.jpg',
      gallery: [
        '/projects/neural-engine-01.jpg',
        '/projects/neural-engine-02.jpg',
        '/projects/neural-engine-03.jpg',
      ],
    },
    snippet: {
      lang: 'ts',
      code: `const engine = await NeuralEngine.boot({
  model: "local/quantized-7b",
  backend: "webgpu",
  cache: "kv-stream",
});

for await (const token of engine.stream(prompt)) {
  ui.render(token); // ~42ms first-token, fully offline
}`,
    },
    liveUrl: '#',
    sourceUrl: '#',
  },
  {
    id: 'signal-mesh',
    name: 'Signal Mesh',
    codename: 'SIGNAL-MESH',
    tagline: 'A self-healing data fabric for distributed agent swarms.',
    tags: ['TypeScript', 'WebRTC', 'CRDT', 'Edge'],
    latencyMs: 18,
    brief: {
      goals: [
        '"objective": "coordinate N agents with no central broker"',
        '"property": "converges to consistent state under partition"',
        '"target": "graceful degradation, never a hard failure"',
      ],
      architecture: [
        '"transport": "peer WebRTC datachannels over a gossip overlay"',
        '"state": "delta-CRDTs with causal ordering"',
        '"observability": "live mesh topology + latency heatmap"',
      ],
    },
    media: {
      video: '/projects/signal-mesh.webm',
      poster: '/projects/signal-mesh-poster.jpg',
      gallery: [
        '/projects/signal-mesh-01.jpg',
        '/projects/signal-mesh-02.jpg',
      ],
    },
    snippet: {
      lang: 'ts',
      code: `const mesh = SignalMesh.join(roomId);

mesh.on("merge", (delta) => state.apply(delta));

state.mutate(draft => {
  draft.cursor = pos; // replicates to every peer, conflict-free
});`,
    },
    liveUrl: '#',
    sourceUrl: '#',
  },
  {
    id: 'aperture-vision',
    name: 'Aperture Vision',
    codename: 'APERTURE-VISION',
    tagline: 'Generative spatial UI driven by realtime scene understanding.',
    tags: ['Python', 'WebGPU', 'Diffusion', 'GLSL'],
    latencyMs: 31,
    brief: {
      goals: [
        '"objective": "compose interfaces from a live camera feed"',
        '"experience": "layout that reacts to depth + attention"',
        '"bar": "60fps with generative passes in the loop"',
      ],
      architecture: [
        '"perception": "segmentation + depth estimation on-device"',
        '"synthesis": "guided diffusion into a GLSL composite layer"',
        '"controller": "GSAP timeline bound to scene salience"',
      ],
    },
    media: {
      video: '/projects/aperture-vision.webm',
      poster: '/projects/aperture-vision-poster.jpg',
      gallery: [
        '/projects/aperture-vision-01.jpg',
        '/projects/aperture-vision-02.jpg',
        '/projects/aperture-vision-03.jpg',
      ],
    },
    snippet: {
      lang: 'py',
      code: `scene = perceive(frame)        # depth + segments, on-device
layout = compose(scene.salience)
canvas = diffuse(layout, steps=4)  # guided, 4-step

render(canvas)  # ~31ms/frame, 60fps target held`,
    },
    liveUrl: '#',
    sourceUrl: '#',
  },
];
