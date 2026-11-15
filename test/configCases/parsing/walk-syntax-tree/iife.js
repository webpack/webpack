"use strict";

const viaCall = function (req, n) {
	return [req("./cjs").value, n, this.tag];
}.call({ tag: "this" }, require, 1);

const viaBind = function (n) {
	return n;
}.bind(null, 2)();

const direct = (function self(req) {
	return [req("./cjs").value, typeof self];
})(require);

const arrow = ((x) => x * 3)(4);

const unbound = function () {
	return 5;
}.apply(null, []);

const notSimple = (({ v }) => v)({ v: 6 });

const unused = (function (a, b) {
	return [a, typeof b];
})(7);

module.exports = { viaCall, viaBind, direct, arrow, unbound, notSimple, unused };
