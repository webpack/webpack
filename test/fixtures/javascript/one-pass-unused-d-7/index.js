function a(x) { if (x) return 42; return x; }
function b(x) { if (x) return 1; else return x; }
function c(x) { if (x) return (g(), y); return x; }
function d(x) { if (x) return p || q; return x; }
function e(x) { if (x) return 42; return y; }
function k(x) { if (x) return (1, h); return x; }
function m(x) { if (x) return function () {}(); return x; }
function n(x) { if (x) return function () { g(); }(); return x; }
