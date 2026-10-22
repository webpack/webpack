"use strict";

// Fail while loading so FallbackModule's loop skips this internal fallback and
// advances to the real external "ABC" instead of resolving through it.
throw new Error("internal fallback intentionally unavailable");
