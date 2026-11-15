function a() { var f = function () { return x(); }; for (;;) f(); }
function b() { function f() { return x(); } while (y) h(f()); }
function c() { var f = () => q; for (;;) h(f()); }
function d() { var f = function () { return x(); }; for (;;) f(y); }
function e() { var f = function (n) { return x(n); }; for (;;) f(); }
function g() { var f = function () { return this.x; }; for (;;) h(f()); }
function i() { var f = function () { return arguments; }; for (;;) h(f()); }
function j() { var f = function () { x(); }; for (;;) f(); }
