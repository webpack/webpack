// An unread assignment of a member prints as the member where its place
var g;
// reads a value, and stays where a call would bind `this`.
function F(v) { this.v = v; }
var a = { b: 1, m: function () { return this === a; } };
function f1(a) { var t; return t = a.b; }
function f2(a) { var t; try { throw t = a.b; } catch (e) { return e; } }
function f3(a) { var t; return [t = a.b]; }
function f4(a) { var t; return new F(t = a.b).v; }
function f5(a) { var t; var u = t = a.b; return u; }
function f6(a) { var t; return { p: t = a.b }.p; }
function f7(a) { var t; return new (t = F)(a.b).v; }
function f8(a) { var t; return (t = a.m)(); }
function f9(a) { var t; g = t = a.b; return g; }
function f10(a) { var t; return delete (t = a.b); }
function f11(a) { var t; return typeof (t = a.b); }
function f12(a) { var t; return { [t = a.b]: 1 }; }
function f13(a) { var t; return `${t = a.b}`; }
console.log(f1(a), f2(a), f3(a), f4(a), f5(a), f6(a), f7(a), f8(a), f9(a), f10(a), f11(a), f12(a), f13(a));
