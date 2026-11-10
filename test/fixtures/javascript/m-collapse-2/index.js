function a(p) { var o = [p]; h(g(), o); }
function b(p) { function k() {} var o = { p: p, k: k }; h(g(), o.k()); }
function c(p) { var o = [p]; h(arguments[0] = 2, o); }
function d(p) { p = 1; var o = [p]; h(g(), o); }
function e() { let o = [q]; h(g(), o); let q = 1; }
var t = 1;
function f() { var o = [t]; h(g(), o); }
