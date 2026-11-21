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
// A member folding to a name is called bare, which binds no `this` either; an
// object or class opening nothing tags bare, a member read off one wrapped.
function q(f) { var t; return (t = { a: f }.a)`x`; }
function r(f) { var t; return (t = { a: f }.a)(); }
function u() { var t; return (t = {})`x`; }
function v() { var t; return (t = class {})`x`; }
function w() { var t; return (t = class {}.x)`x`; }
function x() { var t; return (t = { a: tag }).a`x`; }
// A call of the function an unread write sets prints as what it returns.
function y() { var t; return (t = function () { return 1; })(); }
function z() { var t; return (t = function () {})(); }
function aa() { var t; return (t = function () {})() + 1; }
function bb() { var t; (t = function () {})(); return 2; }
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
	p,
	function () { return q(tag); },
	function () { return r(tag); },
	u,
	v,
	w,
	x,
	y,
	z,
	aa,
	bb
].forEach(function (run, i) {
	try {
		console.log(i, String(run()));
	} catch (err) {
		console.log(i, err.constructor.name);
	}
});
