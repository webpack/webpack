var a = "global";
globalThis.a = "global";
console.log({ p: function () { return function () { return typeof this; }(); } }.p());
console.log({ p: function () { return [1, 2].map(function () { return this.k; }, { k: "K" }).join(); } }.p());
console.log({ a: "own", p: function () { return (() => this.a)(); } }.p());
console.log({ a: "own", p: function () { return { m() { return this.a; }, a: "inner" }.m(); } }.p());
console.log({ a: "own", p: function () { return new (class { constructor() { this.a = "made"; } })().a + this.a; } }.p());
var o = {
	p: function () {
		return function () {
			"use strict";
			return this;
		}();
	}
};
console.log(o.p());
