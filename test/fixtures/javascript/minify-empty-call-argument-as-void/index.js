// An empty call's lone argument prints as `void`'s operand, parenthesized
// only where it binds looser than a unary operand.
var use = console.log;
var a = { b: 1 }, b = 2, s = "x", y = "y";
function f() { return [3]; }
function x() {}
use((() => {})(a.b));
use((() => {})(a + b));
use((() => {})(a, b));
use((() => {})(-a));
use((() => {})(b++));
use((() => {})(!f()));
use((() => {})(f() != b));
use((() => {})(~a));
use((() => {})('x' + y));
use((() => {})(f(x)[0]));
use((() => {})(f()?.b));
use((() => {})(f() ? b : s));
use((() => {})("b" in a));
use((() => {})(b * b));
use((() => {})(/x/.test(s)));
function g() { return (() => {})(`${a}`); }
function h() { if (a) return (() => {})(/x/.test(s)); return 1; }
function k() { var v = (() => {})(f()); }
use(g(), h(), k());
