function a() { return (function (v) { return function () { return v; }; })("x")(); }
function b() { return function () { return function () { return function () { return 1; }; }(); }()(); }
function c() { const A = 10, B = 5; function mod(x, y) { return ((x % y) + y) % y; } return mod(A, A + B); }
function d() { function inner(v) { function closure() { return v; } return function () { return closure(); }; } return inner("y"); }
function e() { function t() { if (p) q(); r(); } function u() { return t(); } u(); x(); }
function f() { const s = (() => () => y)(); return s(); }
function g() { const s = (() => a.b)(); return s(); }
function h() { const s = (() => (k(), a.b))(); return s(); }
const i = () => { (function () { if (p) q(); r(); })(); };
const j = () => { x(); return function () { let v = p(); r(v); }(); };
