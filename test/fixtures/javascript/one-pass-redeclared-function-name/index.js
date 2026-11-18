console.log(
	(function x() {
		var x = 1;
		return x;
	})(),
	(function y() {
		const y = 2;
		return y;
	})(),
	typeof (function z() {
		function z() {}
		return z;
	})(),
	(function w(w) {
		return w;
	})(3)
);
var x = 9;
console.log(
	typeof (function x(a = x) {
		var x;
		return a;
	})(),
	(function x() {
		"use strict";
		var x;
		x = 4;
		return x;
	})()
);
