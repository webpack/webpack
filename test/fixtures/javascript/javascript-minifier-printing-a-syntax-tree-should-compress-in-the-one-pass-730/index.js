function a() { var b = 7, y = 8; if (0) var c = 1, [x, y, z] = [2, 3, 4], b = 5; return [b, c, x, y, z]; }
function d() { if (0) var e = 1; e = 2; return e; }
function f(p) { if (0) var p = 1, q; return [p, q]; }
function h() { for (var k in o); if (0) var k, m; return [k, m]; }
function k() { if (0) var q; function q() {} return q; }
function m(z) { if (0) var u; var { v: [u = 1] } = z; return [z, u]; }
function n() { if (0) var w; (function () { var w; })(); class C { m() { var w; } } w = 1; return w; }
if (0) var t; g(); var t = h(); g(t);
