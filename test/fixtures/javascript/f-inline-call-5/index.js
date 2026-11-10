function a(x) { (function (y) { if (y === 1) throw Error(); })(x); }
function b(x, z) { function t(y, w) { if (y) g(w); h(); } t(x, z); }
function c(x) { (function (y) { if (y) g(() => y); })(x); }
function d(x) { (function (y) { let q = y(); g(q, q); })(x); }
function e(x) { x = 2; (function (y) { if (y) g(y); })(x); }
function f(x) { (function (y) { if (y) g(); h(); k(y); })(x); }
