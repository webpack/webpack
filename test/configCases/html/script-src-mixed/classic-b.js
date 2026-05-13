// classic-b loads after classic-a in document order; it reads the global set
// by classic-a (browser execution order) — webpack doesn't link them.
globalThis.__classicB = "classic-b value";
