# Code coming soon

The independent page is served at `/code/` by the existing LAN static server.
The homepage owner can link to `/code/`; this integration does not edit homepage files.

## Source

- User-supplied archive: `/Users/qs/Desktop/web.zip`.
- Archive SHA-256: `323cce1ed32dcd7c86b55e4c3a3334c97f368ac1b85bfc0e5ec837803da9393c`.
- Imported the exported browser assets from `web/public/assets/`, vendored Three.js
  0.180.0, OrbitControls, Outfit, and their supplied licenses.
- Geometry, manifests, motion binaries, vendor code, and font bytes are unchanged.
- The original asset-source notes and S0 license are retained under
  `dist/code/licenses/`. References to `resources/` and the export scripts in the
  original notes describe the supplied archive, which remains on the Desktop.
- The three motion exports are Dance (9.92 s), Squat (8.46 s), and Kick (3.28 s).
  The page uses Dance; other exported clips remain available in the manifest.
- These are reference trajectories rendered in the browser, not live controller
  inference. The existing `/demo/` controller is a separate application.

## Integration contract

- All page dependencies are served below `/code/`; no CDN or new server is needed.
- Keep the source page's white background, centered pearl-gray robot, and
  `Code Coming Soon` caption.
- Read the homepage's `anchor-language` local-storage preference. English is the
  default; `zh` selects Chinese auxiliary messages. Do not change the preference.
- Use client-side WebGL. The source archive's Linux CPU-rendering backend is not
  part of this static integration.

## Delivery stages

1. Import original assets and licenses, with archive provenance recorded here.
2. Integrate the page, verify playback, recovery, resource isolation, and LAN access.

Verification results will be recorded after the second stage.
