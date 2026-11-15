// Each write is unread and each call reduces to what it returns: printed bare,
// an operator's value would take the template as its operand.
function a(f) { var t; return (t = (() => -f)())`x`; }
function b(f) { var t; return (t = (() => !f)())`x`; }
function c(f, g) { var t; return (t = (() => f + g)())`x`; }
function d(f, g, h) { var t; return (t = (() => (f ? g : h))())`x`; }
function e(f) { var t; return (t = (() => typeof f)())`x`; }
function g(f) { var t; return (t = (() => void f)())`x`; }
function h() { var t; return (t = (() => () => 1)())`x`; }
function k(f) { var t; return (t = (() => new f())())`x`; }
function u(f) { var t; return (t = (() => 1 + f)())`x`; }
function v() { var t; return (t = (() => -1)())`x`; }
// Read off a member, the tag is called with no `this`.
function m(o) { var t; return (t = (() => o.f)())`x`; }
function q(f, i) { var t; return (t = (() => [f][i])())`x`; }
function w(o) { var t; return (t = (() => o["x-y"])())`x`; }
function y(o) { var t; return (t = (() => o[`k`])())`x`; }
function z(o) { var t; return (t = (() => o["k"])())`x`; }
// What tags as itself stays bare.
function n(f) { var t; return (t = (() => f)())`x`; }
function p(f) { var t; return (t = (() => f())())`x`; }
function r(f) { var t; return (t = (() => [{ f: f }])())`x`; }
function s(f) { var t; return (t = (() => [f].concat(f)[1]())())`x`; }
// What a call folds to, a folded test or a nested call picks, or a call
// running something first prints, tags as that does.
function f1() { var t; return (t = Math.max(-1, -2))`x`; }
function f2() { var t; return (t = "ab".charCodeAt(0))`x`; }
function f3(f, g) { var t; return (t = (() => { g(); return -f; })())`x`; }
function f4(o) { var t; return (t = (() => (1 ? o.f : o))())`x`; }
function f5(f) { var t; return (t = (() => (() => -f)())())`x`; }
function f8() { var t; return (t = (() => true)())`x`; }
function f9() { var t; return (t = (() => undefined)())`x`; }
function f10() { var t; return (t = (() => null)())`x`; }
// A number tags bare, and throws for being no function.
function n1() { var t; return (t = (() => 1.5)())`x`; }
function n2() { var t; return (t = (() => 0.5)())`x`; }
function n3() { var t; return (t = (() => 1e3)())`x`; }
function n4() { var t; return (t = (() => 0x10)())`x`; }
// A name a member's value collapsed into tags as that member.
function c1(o) { var t; return (t = (() => { var f = o.m; return f; })())`x`; }
function c2(o) { var f = o.m; var t; return (t = f)`x`; }
function c3(o) { var g; var f = (g = o.m); var t; return (t = f)`x`; }
// A call printing as an operation takes the template as its last operand,
// which throws before the operation reads its operands.
function o1(f) { var t; return (t = Math.pow(f, 2))`x`; }
function o2(f) { var t; return (t = (() => Math.pow(f, 2))())`x`; }
function o3(f) { var t; return (t = Boolean(f < 1))`x`; }
function o4(f) { var t; return (t = String(f))`x`; }
function tag() {
	"use strict";
	return this === undefined ? "unbound" : "bound";
}
function C() { return tag; }
var seen = [];
// Read as a number or a string, alike under `unsafe`.
var recorder = {
	toString: function () { seen.push("toString"); return "2"; }
};
/**
 * @param {(f: object) => unknown} run a call reading its operand
 * @returns {() => string} the run, saying what the operand ran
 */
function reads(run) {
	return function () {
		seen = [];
		try {
			run(recorder);
		} catch (err) {
			seen.push(err.constructor.name);
		}
		return seen.join();
	};
}
[
	function () { return a(tag); },
	function () { return b(tag); },
	function () { return c(tag, tag); },
	function () { return d(true, tag, tag); },
	function () { return e(tag); },
	function () { return g(tag); },
	function () { return h(); },
	function () { return k(C); },
	function () { return m({ f: tag }); },
	function () { return n(tag); },
	function () { return p(C); },
	function () { return q(tag, 0); },
	function () { return r(tag); },
	function () { return s(C); },
	function () { return u(tag); },
	function () { return v(); },
	function () { return w({ "x-y": tag }); },
	function () { return y({ k: tag }); },
	function () { return z({ k: tag }); },
	f1,
	f2,
	function () { return f3(tag, C); },
	function () { return f4({ f: tag }); },
	function () { return f5(tag); },
	f8,
	f9,
	f10,
	n1,
	n2,
	n3,
	n4,
	function () { return c1({ m: tag }); },
	function () { return c2({ m: tag }); },
	function () { return c3({ m: tag }); },
	reads(o1),
	reads(o2),
	reads(o3),
	reads(o4)
].forEach(function (run, i) {
	try {
		console.log(i, String(run()));
	} catch (err) {
		console.log(i, err.constructor.name);
	}
});
