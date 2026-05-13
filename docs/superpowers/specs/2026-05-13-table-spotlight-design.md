# Table Spotlight Booking-Status Design

**Date:** 2026-05-13
**Component touched:** `components/PublicFloorPlan.js`
**New module:** `lib/floorplan/spotlightBeams.js`

## Goal

Replace the current grey-recolor booking-status indicator on the customer floorplan with theatrical descending spotlight beams. Reserved tables get a persistent red beam from above; the table the customer is hovering (desktop) or has tapped (mobile) gets a gold beam, signalling "selected." Gives the floorplan a nightclub-stage feel and makes status both glanceable and dramatic.

## Final Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Reserved-table visual | Persistent **red descending beam** on every reserved table |
| Hover-state color | **Gold** (`#C9A84C`, Velvet brand) |
| Light shape | **Theatrical descending beam** — actual visible volumetric cone from above |
| Reserved beam vs hover beam | **Symmetric in shape and presence** — same cone geometry, shader, and full theatrical look; only color and animation differ (red breathes subtly, gold fades in/out on hover) |
| Mobile / touch behavior | Tap available table → gold beam appears + **"Book this table"** CTA bar slides up from bottom → tap CTA opens existing booking dialog. No CTA until a table is selected. |
| Desktop behavior | Hover = gold beam appears (no CTA). Click table = existing booking dialog opens directly (unchanged). |
| Pre-date/time state | Tables are not selectable until date+time is picked. No beams (gold or red) appear until then. Existing toast `"Please select a date and time first before choosing a table"` continues to fire on premature clicks. |
| Existing tooltips | Kept (table-info on hover available, "Table Not Available" on hover reserved). Beam is additive, not a replacement. |
| Existing grey-recolor of booked tables | **Removed.** Red beam is now the only status signal. |
| Implementation approach | **Custom volumetric beam meshes** (cone geometry + custom `ShaderMaterial`, additive blending) — no actual `THREE.SpotLight` instances. Scales to many beams without shader-recompile jank. |
| Bloom post-processing | Optional — add only if beams look flat in practice. Not part of initial implementation. |

## Architecture

### New module: `lib/floorplan/spotlightBeams.js`

Sole public surface:

```js
const beams = createSpotlightBeams({ scene, camera });

beams.setHoverPosition(tableMesh | null);       // null hides gold beam
beams.setReservedTables(tableMeshById, tableIds); // [] clears all red beams
beams.tick(deltaTime);                            // call each animation frame
beams.dispose();                                  // call on unmount
```

All beam geometry, shaders, animation, and pooling lives inside this module. `PublicFloorPlan.js` only calls these four methods. Keeps the already-large component from growing further.

### Beam construction

Each beam is a single `THREE.Mesh`:

- **Geometry:** `ConeGeometry(radiusTop ≈ 0.05, radiusBottom ≈ 0.7, height ≈ 4, radialSegments 32, heightSegments 1, openEnded true)`. Narrow at top (light source), wider at bottom (where it hits the table).
- **Material:** `ShaderMaterial` with:
  - `transparent: true`
  - `depthWrite: false`
  - `blending: THREE.AdditiveBlending`
  - `side: THREE.DoubleSide`
- **Fragment shader** does two things:
  1. **Gradient alpha** from 0 at the top of the cone to a peak alpha near the bottom — beam reads as denser where it meets the table.
  2. **Radial falloff** toward cone edges — soft silhouette, not a hard cone line.
- **Uniforms:** `uColor` (vec3), `uIntensity` (float, 0–1), `uTime` (float).
- **Floor disc:** small additive `CircleGeometry` parented to the beam, oriented flat, positioned just above the table top. Renders the bright "puddle of light" where the beam terminates on the table.

### Beam pooling

- **Gold beam:** one persistent mesh. Always exists, visibility toggled via `uIntensity` lerp. Position is lerped toward the current target table.
- **Red beams:** N meshes, one per reserved table, created when `setReservedTables` is called with a new list. Disposed when a table leaves the reserved set or on unmount.

### Beam placement

`beam.position = (tablePos.x, tablePos.y + tableHeight/2 + 2, tablePos.z)`. The cone extends downward by its `height` (~4 units), so the bottom of the cone sits at the table surface and the top sits near the ceiling.

Beams are world-space vertical regardless of camera angle — they always read as descending from above.

### Animation (per `tick(dt)` call)

- **Gold beam:**
  - `uIntensity` lerps current → target (target is 0 when no hover, 1 when hovering) at a rate of roughly 12 units/second.
  - Position lerps toward the target table position at the same rate, so moving the mouse between tables produces a smooth slide rather than a teleport.
- **Red beams:**
  - `uIntensity = 0.85 + 0.15 * sin(uTime * 1.5)` — subtle breathing pulse. Enough motion to feel alive without strobing.

## Integration with `PublicFloorPlan.js`

### State + refs added

- `beamsRef` — holds the manager returned by `createSpotlightBeams`.
- `selectedTableRef` (mobile only) — the currently-tapped table mesh, or `null`.
- `showMobileCTAState` — React state driving whether the bottom "Book this table" CTA bar is rendered.
- `isTouch` — derived: `'ontouchstart' in window || navigator.maxTouchPoints > 0`.

### Lifecycle

1. **After scene init** (near line 596 where the existing managers `doorManagerRef` / `windowManagerRef` are constructed):
   ```js
   beamsRef.current = createSpotlightBeams({ scene, camera });
   ```
2. **In the existing animation loop** (the `requestAnimationFrame` driver):
   ```js
   beamsRef.current.tick(deltaTime);
   ```
3. **When `availableTables` changes** — a new `useEffect` keyed on `[availableTables, date, time]`:
   - Build `tableMap` = `Map<tableId, mesh>` by walking `sceneRef.current.children` and picking objects with `userData.objectId` (the existing identifier used at line 880).
   - If `dateRef.current && timeRef.current` are both set: `reservedIds = Array.from(tableMap.keys()).filter(id => !availableTables.has(id))`. Call `beamsRef.current.setReservedTables(tableMap, reservedIds)`.
   - If date or time is missing: call `beamsRef.current.setReservedTables(tableMap, [])` — no beams yet.

   This `useEffect` replaces the old grey-recolor work that ran inside the post-booking success block; both the initial availability fetch (line ~1627) and post-booking re-fetch funnel through this single update path.
4. **On unmount:** `beamsRef.current.dispose()`.

### Interactions

**Desktop hover** (existing `mousemove` raycaster, ~line 867):
- On intersection with an available table (and date+time set): `beams.setHoverPosition(table)`.
- On intersection with a reserved table, on no intersection, or before date+time set: `beams.setHoverPosition(null)`.

**Desktop click** (~line 971): unchanged. Available table opens booking dialog; reserved table shows the existing "Table Not Available" tooltip; no date+time fires the existing toast.

**Mobile tap** (new path, gated on `isTouch`):
- Tap-vs-drag detection: track `pointerdown` start position and timestamp; treat as a tap only if `pointerup` fires within 300ms AND pointer moved less than ~10px. Movement beyond that threshold is an OrbitControls drag (camera orbit) and must not trigger selection.
- Tap on an available table (date+time set):
  - `beams.setHoverPosition(table)`
  - `selectedTableRef.current = table`
  - `setShowMobileCTAState(true)`
- Tap on a different available table: update target and selectedTable, CTA stays.
- Tap on the same selected table again, or tap on empty floor:
  - `beams.setHoverPosition(null)`
  - `selectedTableRef.current = null`
  - `setShowMobileCTAState(false)`
- Tap on a reserved table: existing "Table Not Available" tooltip shows, no selection state changes.

**Mobile CTA bar:**
- Rendered when `showMobileCTAState` is true and `isTouch` is true.
- Layout: `fixed inset-x-0 bottom-0`, full-width gold button labeled "Book This Table — {tableName}" with the table name pulled from `selectedTableRef.current.userData`.
- On tap: invokes the existing `createBookingDialog(...)` flow (line 1107 area) using the selected table.
- After the booking dialog closes (success or cancel): `selectedTableRef.current = null`, `setShowMobileCTAState(false)`, `beams.setHoverPosition(null)`.

### Removal

- Lines ~1594–1614 in `PublicFloorPlan.js`: the post-booking-success block that sets booked table materials to `0x4a4a4a` (dark grey) via `mat.color.setHex` / `child.material.color.setHex`. Delete the recolor; the existing `setReservedTables` call (driven by the `availableTables` re-fetch on ~line 1627) will paint the red beam.
- One pre-implementation grep pass for any other `material.color` mutation tied to booking status. Expected: only the block above; if more turn up, remove them too.

## Edge cases

- **OrbitControls camera angle:** beams are vertical world-space cones, so they read as descending regardless of how the user orbits the camera. The floor disc on the beam also stays flat on the table top.
- **Many reservations (Christmas-tree risk):** user explicitly accepted this. The subtle 1.5 Hz breathing avoids a static frozen look; additive blending keeps overlapping beams readable.
- **Mobile portrait viewport:** CTA bar lives below the floorplan (`fixed bottom-0`); does not cover the canvas because the canvas height already accounts for the existing date-time selector chrome. CTA bar adds ~64–72px height — verify against existing mobile layout before merge.
- **Hover transitions between tables in fast succession:** position lerp at ~12/s smooths multi-table hover paths. `uIntensity` stays high while moving between available tables.
- **Webgl context loss / restore:** existing `handleContextLost` / `handleContextRestored` handlers will be extended to call `beams.dispose()` and re-create on restore (or, simpler, to recreate the entire scene including beams).

## Testing

### Unit (`lib/floorplan/spotlightBeams.test.js`)

Mock scene and camera; verify:
- `createSpotlightBeams({ scene, camera })` returns an object with `setHoverPosition`, `setReservedTables`, `tick`, `dispose`.
- `setReservedTables(map, ['t1', 't2'])` adds 2 meshes to the scene.
- Calling again with `['t1']` disposes the `t2` mesh (and frees its geometry/material).
- Calling with `[]` disposes all red beams.
- `setHoverPosition(table)` sets a target position; `setHoverPosition(null)` flags the gold beam to fade out.
- `dispose()` removes all beam meshes from the scene and disposes all geometry/material.

No tests for the shader output or animation values — those are visual.

### Manual verification (browser)

1. Open a restaurant booking page without picking date/time. Hover tables — no beams. Click table — existing toast fires.
2. Pick a date and a time. Reserved tables glow red (persistent breathing pulse). Hover an available table — gold beam descends, table is lit. Hover off — gold beam fades.
3. Hover from one available table directly to another — gold beam slides smoothly.
4. Click an available table — booking dialog opens. Complete or cancel a booking; verify the newly-reserved table picks up a red beam after the availability re-fetch and the grey-recolor is gone.
5. Hover a reserved table — gold beam does not appear; existing "Table Not Available" tooltip with booked-time ranges still shows.
6. Switch to mobile DevTools emulation (or a real device). Tap an available table — gold beam appears, "Book This Table" CTA bar slides up. Tap CTA — booking dialog opens. Cancel — CTA + beam clear. Tap another available table — target updates. Tap the same table again — selection clears.
7. Orbit the camera (drag on canvas) — beams remain vertical and read as descending from above at any angle.

## Out of scope (not in this design)

- Bloom post-processing (add later if beams look flat).
- Restyling the booking dialog itself.
- Theme/color refactor (separate pending design).
- Replacing or unifying the two booking flows (separate pending decision).
