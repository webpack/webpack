function a() { var { x: l, y } = { x: 1, y: 2 }; return l; }
function b() { let { p, q = 1, r = function () {} } = { p: 1 }; return p; }
function c(o) { var { x, y } = o; return x; }
function d() { var { x, y, ...r } = { x: 1, y: 2 }; return [x, r]; }
function e() { var { [k()]: x, y } = { y: 1 }; return y; }
function f() { var { x, y } = { get y() { return g(); }, x: 1 }; return x; }
function h() { var { x, y = g() } = { x: 1 }; return x; }
function i() { var { x, y } = { __proto__: o, x: 1 }; return x; }
function j() { var { x, /*! keep */ y } = { x: 1 }; return x; }
function m() { var { x, y: { z, w } } = { x: 1, y: { z: 2 } }; return [x, z]; }
function n() { var { x, y } = { x: 1, ...s, [k]: 2 }; return x; }
function p() { var { x, y: { z, w } } = { x: 1, y: { z: 2 }, ...s }; return [x, z]; }
function q() { var { [s]: x, y } = { y: 1 }; return y; }
function r() { var { [s]: { a, b } } = { s: { a: 1 } }; return a; }
function t() { var { __proto__: { a, b } } = {}; return a; }
function u() { var { y: { z, w } } = { y: { z: 2 }, x: 1 }; return z; }
function v() { var { q: { a, b } } = { x: 1 }; return a; }
