// Each write is unread, so it prints as its value: a member read off what it
// sets runs nothing, a function it sets and calls prints as its statements,
// and a template it tags opens an arrow's body or a statement as one tagged
// directly does.
var log = [];
function note(s) { log.push(s); }
function a() {
	var t;
	(t = {}).x;
	(t = { a: 1 }).a;
	(t = class {}).name;
	(t = function () {}).x;
	(t = [])[0];
	typeof (t = {}).x;
	return log.length;
}
function b() { var t; (t = function () { note("b"); })(); return log.pop(); }
function c() { var t; (t = () => { note("c"); })(); return log.pop(); }
function d() { var t; (t = function () { note("d"); })(), note("e"); return log.join(); }
function e(x) { var t; if (x) (t = function () { note("e"); })(); return log.pop(); }
function g() {
	var t;
	(t = function () { note(this === undefined ? "unbound" : "bound"); })();
	return log.pop();
}
function h() { var t; return () => (t = {})`x`; }
function k() { var t; return () => (t = class {})`x`; }
function m() {
	var t, r;
	(t = { a: function () { r = this === undefined ? "unbound" : "bound"; } }).a`x`;
	return r;
}
// A call of a function running nothing a `return` ending the body gives
// prints only what its arguments run.
function n(x) { return (() => {})(x); }
function p(x) { note("p"); return (function () {})(x, x); }
function q() { var t; return (t = () => {})(missing); }
[
	a,
	b,
	c,
	d,
	function () { return e(1); },
	g,
	function () { return h()(); },
	function () { return k()(); },
	m,
	function () { return n(1); },
	function () { return p(1); },
	q
].forEach(function (run, i) {
	log.length = 0;
	try {
		console.log(i, String(run()));
	} catch (err) {
		console.log(i, err.constructor.name);
	}
});
