function a() { return function () { var unused; }(); }
function b() { x(function () { var unused; }()); }
function c() { var v = function () { var unused; }(); g(); }
function d() { function h(n) {} return h(1); }
function e() { function h(n) {} return h(y); }
function f() { x(async function () { var unused; }()); }
function g() { if (y) return function () { var unused; }(); z(); }
