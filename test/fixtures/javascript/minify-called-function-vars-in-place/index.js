// A function called in place prints its body there, its `var`s then the
// holder's, where no name around or placed before collides.
var n = 0;
function f() { return ++n; }
function g() { console.log.apply(console, arguments); }
function o1() {
	(function () { var a = f(); g(a, a); })();
	(function () { var b = f(); g(b, b); })();
}
function o2() {
	(function () { var a = f(); g(a, a); })();
	(function () { var a = f(); g(a, a); })();
}
function o3() { var a = 1; (function () { var a = f(); g(a, a); })(); return a; }
function o4(x) { if (x) { (function () { var c = f(); g(c, c); })(); } }
function o5() { (function () { var d = f(); var d = f() + d; g(d, d); })(); }
function o6() { (function () { var e; g(1); })(); }
function o7() { eval(""); (function () { var h = f(); g(h, h); })(); }
function o9() { (function () { var k = f(); g(k, k, function () { return k; }); })(); }
function o10() { function inner() { var m = f(); g(m, m); } inner(); }
function o11() { if (0) var q = 1; (function () { var r = f(), q; g(r, r); })(); return q; }
function o12() { while (0) var s = 1; (function () { var s = f(); g(s, s); })(); return s; }
o10(); g(o11()); g(o12());
o1(); o2(); g(o3()); o4(1); o5(); o6(); o7(); o9();
