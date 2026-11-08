function a() { let t; return (t = o.f)(); }
function b() { let t; return (t = o?.f)``; }
function c() { let t; return (t = eval)(x); }
function d() { let t; return g(t = o.f) + (t = o.h); }
function e() { let t; return (t = f)(); }
// Its object, a `typeof` or a `delete` reads the reference itself.
function h() { let t; return (t = o.f).g; }
function i() { let t; return typeof (t = x); }
function j() { let t; return delete (t = o.f); }
function k() { var t; f(t = o.f); return function () { return t; }; }
