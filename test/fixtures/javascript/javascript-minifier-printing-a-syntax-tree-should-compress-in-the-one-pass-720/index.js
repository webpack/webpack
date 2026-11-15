function a(v) { switch (v) { case E: { let { data } = v; call(data); } } }
function b(v) { switch (v) { case E: { function d() {} call(d); } } }
function c(v, o) { switch (v) { case E: { let d = v; call(d); } break; default: o(); } }
function d(v) { switch (v) { case E: { call(v); } } }
function e(v) { switch (v) { case E: { let d = h(); g(d, d); break; } } }
function f(v) { switch (v) { case E: { g(); h(); break; } } return 1; }
function i(v) { switch (v) { case E: { break; } } }
function j(v) { switch (v) { case E: { if (v) break; g(); break; } } }
function k(v) { switch (v) { case E: { g(); break; } default: m(); } }
