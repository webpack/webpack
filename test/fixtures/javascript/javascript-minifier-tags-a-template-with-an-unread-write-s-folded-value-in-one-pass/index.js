// Each write is unread, so the template tags its value as that value prints:
// folded to a number, a string or a regular expression, itself unread, or a
// sequence, function or object in parentheses of its own.
function a(s) { var t; return (t = s = 2)`x`; }
function b(f) { var t, s; return (t = s = f)`x`; }
function c(o) { var t, s; return (t = s = o.f)`x`; }
function d() { var t; return (t = Math.abs(-1) + 0)`x`; }
function e() { var t; return (t = "a" + "b")`x`; }
function g() { var t; return (t = 1 + 2)`x`; }
function h() { var t; return (t = /a/)`x`; }
function k(f, g) { var t; return (t = (f(), g))`x`; }
function m() { var t, r; (t = function () { r = "called"; })`x`; return r; }
function n() { var t; (t = {})`x`; }
function p() { var t; return (t = true)`x`; }
function tag() {
	"use strict";
	return this === undefined ? "unbound" : "bound";
}
[
	function () { return a(0); },
	function () { return b(tag); },
	function () { return c({ f: tag }); },
	d,
	e,
	g,
	h,
	function () { return k(tag, tag); },
	m,
	n,
	p
].forEach(function (run, i) {
	try {
		console.log(i, String(run()));
	} catch (err) {
		console.log(i, err.constructor.name);
	}
});
