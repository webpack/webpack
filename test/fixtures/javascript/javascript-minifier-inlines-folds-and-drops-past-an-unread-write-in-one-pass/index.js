// Each write is unread, so a function it sets and calls takes the constants
// passed, an optional call of it is a plain one, a member read off an object
// it sets folds, and what it sets tags or calls opens as written in place.
var log = [];
function note(s) { log.push(s); }
function a() { var t; (t = function (s) { note(s); })("a"); return log.pop(); }
function b() { var t; (t = function () { note("b"); })?.(); return log.pop(); }
function c() { (function () { note("c"); })?.(); return log.pop(); }
function d(x) { if (x) (function () { note("d"); })?.(); return log.pop(); }
function e() { var t; return () => (t = { a: 1 }).a; }
function g() { return () => ({ a: 2 }.a); }
function h() { var t; return () => (t = {}).a`x`; }
function k() { return () => ({}.a)`x`; }
function m() { var t; (t = function () {}.a)``; }
// A `return` ending a body or leaving early gives `undefined` either way.
function n() { note("n"); return function () { note(this === undefined ? "unbound" : "bound"); }(log); }
function p(x) { return (() => {})(x); }
function q() { var x; return (() => {})(x); }
function r(x) { if (x) return (() => {})(x); note("r"); }
function u() { return (() => {})(1), log.length; }
[
	a,
	b,
	c,
	function () { return d(1); },
	function () { return e()(); },
	function () { return g()(); },
	function () { return h()(); },
	function () { return k()(); },
	m,
	function () { n(); return log.join(); },
	function () { return p(1); },
	q,
	function () { r(1); r(0); return log.join(); },
	u
].forEach(function (run, i) {
	log.length = 0;
	try {
		console.log(i, String(run()));
	} catch (err) {
		console.log(i, err.constructor.name);
	}
});
