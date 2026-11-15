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
// Read off a member, the tag is called with no `this`.
function m(o) { var t; return (t = (() => o.f)())`x`; }
function q(f, i) { var t; return (t = (() => [f][i])())`x`; }
// What tags as itself stays bare.
function n(f) { var t; return (t = (() => f)())`x`; }
function p(f) { var t; return (t = (() => f())())`x`; }
function r(f) { var t; return (t = (() => [{ f: f }])())`x`; }
function s(f) { var t; return (t = (() => [f].concat(f)[1]())())`x`; }
function tag() { return this === undefined || this === globalThis ? "unbound" : "bound"; }
function C() { return tag; }
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
	function () { return s(C); }
].forEach(function (run, i) {
	try {
		console.log(i, String(run()));
	} catch (err) {
		console.log(i, err.constructor.name);
	}
});
