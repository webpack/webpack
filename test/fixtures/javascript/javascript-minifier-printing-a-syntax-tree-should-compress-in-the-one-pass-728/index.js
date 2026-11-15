function a([x, y, z]) { return y; }
function b() { var [x, y, { p, q }] = [1, 2, { q: 3 }]; return [y, q]; }
function c(o) { var [x = g(), y] = o; return y; }
function d(o) { var [x = 1, y] = o; return y; }
function e(o) { var [x, ...y] = o; return y; }
function f(o) { var [x, [y]] = o; return x; }
function h(o) { var [x, y] = o; return x; }
try { t(); } catch ([u, v]) { w(v); }
function i(o) { var [x, ...y] = o; return y; }
function j() { var [a, [b, c]] = [1, [2, 3]]; return [a, c]; }
function k() { var [a, { p, q }] = [...s, { q: 1 }]; return q; }
function l() { var [a, { p, q }] = [1]; return q; }
function m() { var [a, { p, q }] = [, { q: 1 }]; return q; }
function n(o) { var [x, y, , ] = o; return x; }
function o(o) { var [x, y, z] = o; return [x, z]; }
function p(o) { var { y: [a, b] } = o; return b; }
function q(o) { var [[a, b] = []] = o; return b; }
var r = ([e, t]) => t;
