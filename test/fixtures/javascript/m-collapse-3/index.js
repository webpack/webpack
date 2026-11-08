function a(p) { var o = [p]; g(); h(o); }
function b(p) { var o = { x: p }; if (g()) h(o); }
function c(p) { var o = [p]; g(); for (;;) h(o); }
function d(p) { var o = [p]; g(() => o); }
function e(p) { var o = [p]; g(); { let p = q(); h(o, p); } }
function f(p) { var o = [p]; g(); try { h(o); } catch (p) { k(p); } }
function g2(p) { var o = [p], n = k(); g(); h(o, n); }
