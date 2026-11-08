x: for (;;) { for (;;) { if (a) continue x; if (b) continue x; g(); } }
// Leaving by other labels, the two stay apart.
y: for (;;) { z: for (;;) { if (c) break y; if (d) break z; h(); } }
