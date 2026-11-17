function a(x) { switch (x) { case 0 /*!keep*/: return g(); case 1 /*!keep*/: return g(); } }
function b(x) { switch (x) { case 0: return g(); case 1 /*!keep*/: return g(); } }
function c(x) { switch (x) { case 0: return tag`x`; case 1: return tag`x`; } }
function d(x) { switch (x) { case 0: return () => tag`x`; case 1: return () => tag`x`; } }
