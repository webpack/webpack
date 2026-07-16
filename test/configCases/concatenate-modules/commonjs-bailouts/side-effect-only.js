"use strict";

// strict, no exports (dynamic exports type) — nothing to hoist and nothing to
// wrap, so it keeps its previous (bailed) behavior
globalThis.__webpackWrappedSideEffect = "ran";
