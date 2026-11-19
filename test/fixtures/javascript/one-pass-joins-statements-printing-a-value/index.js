"use strict";
var o = { a: 1 };
function f(n) {
	console.log("f", n);
	return n;
}
function declared(x) {
	var b = f(1);
	f(2);
	var c = x ? f(3) : x;
	return f(4);
}
function heads() {
	f(5);
	for (var b = f(6); 0; );
	L: for (f(7); !1; ) continue L;
	return 8;
}
function classes() {
	class X {
		static a = f(9);
	}
	f(10);
}
function kept(x) {
	var b = f(11),
		c = f(12);
	f(13);
	return x;
}
// A value joined after another's comma opens no statement.
function values(B) {
	var a = f(14);
	var b = class extends B {},
		c = function () {
			f(15);
		}();
	return 16;
}
console.log(declared(o), declared(0), heads(), heads(), classes(), classes());
console.log(kept(1), kept(2), values(Object));
