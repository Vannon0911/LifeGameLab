# 04 Runtime Render UI

## Runtime
- Sim-Treiber: setInterval(1000/24)
- Render-Treiber: requestAnimationFrame
- alpha interpolation: elapsedSinceStep / TICK_RATE_MS
- Tick contract is hard-frozen at 24 TPS for mainline runtime.

## UI Mainline Modes (Frozen)
- Mainline modes: Build + Play.
- Inspect mode is currently removed from canonical MVP behavior.

## Funktionale Matrix
| File | Line | Symbol | Kind |
|---|---:|---|---|
| src/app/main.js | 51 | hasRunnableWorld | function |
| src/app/main.js | 61 | recoverWorld | function |
| src/app/main.js | 171 | shouldUseOffscreen | method |
| src/app/main.js | 179 | summarizeWorldView | method |
| src/app/main.js | 183 | countOnes | const-arrow |
| src/app/main.js | 196 | makeSignature | method |
| src/app/main.js | 217 | render | method |
| src/app/main.js | 311 | publishPerfStats | function |
| src/app/main.js | 354 | runOneSimStep | function |
| src/app/main.js | 366 | runDevBalanceChecks | function |
| src/app/main.js | 370 | runRender | function |
| src/app/main.js | 391 | runUiSync | function |
| src/app/main.js | 403 | startSimInterval | function |
| src/app/main.js | 416 | tunePerformance | function |
| src/app/main.js | 467 | loop | function |
| src/app/runtime/bootStatus.js | 1 | ensureBootStatus | function |
| src/app/runtime/bootStatus.js | 22 | setBootStatus | function |
| src/app/runtime/bootStatus.js | 34 | bindBootStatusErrorHooks | function |
| src/app/runtime/reportUtils.js | 1 | downloadTextFile | function |
| src/app/runtime/reportUtils.js | 13 | toFiniteNumberOrZero | function |
| src/app/runtime/reportUtils.js | 23 | summarizeSeries | function |
| src/app/runtime/worldStateLog.js | 28 | getCookie | function |
| src/app/runtime/worldStateLog.js | 34 | setCookie | function |
| src/app/runtime/worldStateLog.js | 39 | emitUpdate | function |
| src/app/runtime/worldStateLog.js | 45 | createWorldStateLog | function |
| src/app/runtime/worldStateLog.js | 53 | init | method |
| src/app/runtime/worldStateLog.js | 72 | persistMeta | method |
| src/app/runtime/worldStateLog.js | 80 | track | method |
| src/app/runtime/worldStateLog.js | 125 | getAll | method |
| src/app/runtime/worldStateLog.js | 134 | clear | method |
| src/app/runtime/worldStateLog.js | 150 | esc | const-arrow |
| src/app/runtime/worldStateLog.js | 162 | getMeta | method |
| src/game/render/fogOfWar.js | 5 | clamp | function |
| src/game/render/fogOfWar.js | 9 | getTileFogState | function |
| src/game/render/fogOfWar.js | 20 | applyFogToColor | function |
| src/game/render/fogOfWar.js | 34 | cpuSignatureBand | function |
| src/game/render/fogOfWar.js | 41 | buildFogIntel | function |
| src/game/render/fogOfWar.js | 95 | redactCpuBlockerDetail | function |
| src/game/render/fogOfWar.js | 113 | applyFogIntelToAdvisorModel | function |
| src/game/render/renderer.js | 9 | clamp01 | function |
| src/game/render/renderer.js | 10 | clamp | function |
| src/game/render/renderer.js | 14 | computeLodFromZoom | function |
| src/game/render/renderer.js | 23 | hslToRgb | function |
| src/game/render/renderer.js | 32 | computeSingleMoveHint | function |
| src/game/render/renderer.js | 61 | mutationIntensityFromTrait | function |
| src/game/render/renderer.js | 73 | getPlayerVisualState | function |
| src/game/render/renderer.js | 85 | getDoctrinePalette | function |
| src/game/render/renderer.js | 103 | toRgbTriplet | function |
| src/game/render/renderer.js | 111 | computeConflictSignal | function |
| src/game/render/renderer.js | 123 | computeRenderModeFieldColor | function |
| src/game/render/renderer.js | 179 | computeOverlayFieldColor | function |
| src/game/render/renderer.js | 284 | computeFieldSurfaceColor | function |
| src/game/render/renderer.js | 292 | drawNetworkLinks | function |
| src/game/render/renderer.js | 336 | hasStable2x2 | function |
| src/game/render/renderer.js | 343 | drawFieldGlyphs | function |
| src/game/render/renderer.js | 382 | drawPlantsOverlay | function |
| src/game/render/renderer.js | 418 | drawFieldHotspots | function |
| src/game/render/renderer.js | 437 | drawClusterOverlay | function |
| src/game/render/renderer.js | 457 | drawBirthChargeNodes | function |
| src/game/render/renderer.js | 498 | drawActionOverlay | function |
| src/game/render/renderer.js | 531 | drawLightShadowOverlay | function |
| src/game/render/renderer.js | 561 | drawEvents | function |
| src/game/render/renderer.js | 597 | drawRoundCells | function |
| src/game/render/renderer.js | 808 | drawGrid | function |
| src/game/render/renderer.js | 883 | drawSuperBlocks | function |
| src/game/render/renderer.js | 928 | drawFieldSurface | function |
| src/game/render/renderer.js | 982 | shouldDrawLegacyZoneOverlay | function |
| src/game/render/renderer.js | 987 | drawZoneOverlay | function |
| src/game/render/renderer.js | 1029 | drawCommittedZoneRoleRings | function |
| src/game/render/renderer.js | 1063 | drawResourceMarkers | function |
| src/game/render/renderer.js | 1091 | drawHarvestProgress | function |
| src/game/render/renderer.js | 1119 | drawPatternObjectMarker | function |
| src/game/render/renderer.js | 1154 | render | function |
| src/game/render/renderer.js | 1178 | drawFrame | function |
| src/game/render/renderer.js | 1226 | screenToWorld | function |
| src/game/ui/ui.dom.js | 1 | el | function |
| src/game/ui/ui.dom.js | 8 | fmt | function |
| src/game/ui/ui.dom.js | 12 | fmtSign | function |
| src/game/ui/ui.dom.js | 16 | isDesktopLayout | function |
| src/game/ui/ui.eingriffe.js | 5 | renderEingriffePanel | function |
| src/game/ui/ui.feedback.js | 3 | createActionFeedback | function |
| src/game/ui/ui.feedback.js | 12 | buildGateFeedback | function |
| src/game/ui/ui.feedback.js | 16 | announceInLiveRegion | function |
| src/game/ui/ui.input.js | 3 | installUiInput | function |
| src/game/ui/ui.input.js | 5 | _bindControls | method |
| src/game/ui/ui.input.js | 6 | speedForGrid | const-arrow |
| src/game/ui/ui.input.js | 16 | togglePlay | const-arrow |
| src/game/ui/ui.input.js | 102 | _bindViewportMode | method |
| src/game/ui/ui.input.js | 105 | onChange | const-arrow |
| src/game/ui/ui.input.js | 112 | _bindGlobalKeys | method |
| src/game/ui/ui.input.js | 126 | _paintAtClient | method |
| src/game/ui/ui.input.js | 301 | _bindCanvasPaint | method |
| src/game/ui/ui.input.js | 317 | end | const-arrow |
| src/game/ui/ui.js | 3 | UI | class |
| src/game/ui/ui.js | 4 | constructor | method |
| src/game/ui/ui.js | 11 | setRenderInfo | method |
| src/game/ui/ui.js | 15 | setCanvas | method |
| src/game/ui/ui.js | 26 | sync | method |
| src/game/ui/ui.lage.js | 19 | countMaskTiles | function |
| src/game/ui/ui.lage.js | 28 | summarizeFog | function |
| src/game/ui/ui.lage.js | 38 | countZoneRoleTiles | function |
| src/game/ui/ui.lage.js | 47 | getZoneMetaCount | function |
| src/game/ui/ui.lage.js | 52 | getPatternClassCount | function |
| src/game/ui/ui.lage.js | 62 | formatPatternBonusSummary | function |
| src/game/ui/ui.lage.js | 70 | renderLagePanel | function |
| src/game/ui/ui.lage.js | 94 | mkBar | const-arrow |
| src/game/ui/ui.lage.js | 106 | mkMetric | const-arrow |
| src/game/ui/ui.layout.js | 4 | installUiLayout | function |
| src/game/ui/ui.layout.js | 6 | _build | method |
| src/game/ui/ui.model.js | 11 | getPlayerMemory | function |
| src/game/ui/ui.model.js | 16 | getInfluencePhase | function |
| src/game/ui/ui.model.js | 25 | getRiskState | function |
| src/game/ui/ui.model.js | 33 | getGoalState | function |
| src/game/ui/ui.model.js | 55 | getStructureState | function |
| src/game/ui/ui.model.js | 61 | getBottleneckState | function |
| src/game/ui/ui.model.js | 77 | getActionState | function |
| src/game/ui/ui.model.js | 81 | getLeverState | function |
| src/game/ui/ui.model.js | 85 | getZoneState | function |
| src/game/ui/ui.model.js | 89 | getOverlayState | function |
| src/game/ui/ui.model.js | 93 | getWinModeState | function |
| src/game/ui/ui.model.js | 97 | getResultReasonState | function |
| src/game/ui/ui.overlay.js | 4 | installUiOverlay | function |
| src/game/ui/ui.overlay.js | 6 | _showGameOverlay | method |
| src/game/ui/ui.panels.js | 4 | installUiPanels | function |
