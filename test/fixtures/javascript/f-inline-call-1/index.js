function a() { function log(n) { console.log(n); } log(1); x(); }
function b() { function t() { if (p) q(); r(); } t(); x(); }
function c() { var t = function () { if (p) q(); r(); }; t(); }
function d() { function t() { let v = p(); if (v) q(); r(v); } t(); x(); }
function e() { function t() { if (p) q(); r(); } return t(); }
function f() { (function () { if (p) q(); r(); })(); x(); }
function g() { function t(n) { if (n) q(); r(n); } t(2); x(); }
function h() { function t() { if (p) q(); r(); } t(y); }
