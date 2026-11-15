function a() { var v = f(); (function () { if (0) { var v = 1; } h(v); })(); h(v); }
function b() { var v = f(); (function () { switch (1) { case 0: var v = 1; break; case 1: h(v); } })(); h(v); }
function c() { (function () { if (0) { var v = 1; } h(v); })(); h(w); }
(function () { if (0) { var v = 1; } h(v); })();
x();
