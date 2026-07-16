"use strict";

// strict, no exports (dynamic exports type) — nothing to hoist and nothing to
// wrap, so it keeps its previous (bailed) behavior
// `global` (not `globalThis`) so the bundle runs on Node < 12 in CI
global.__webpackWrappedSideEffect = "ran";
