// A call nothing reads of a function whose body is one expression statement
// prints as that statement's expression, its parameter's one read taking
// what is passed.
function g(a, b) {
	console.log(typeof a, b);
	return a;
}
function h() {
	console.log("h");
	return 1;
}
(function (o) {
	g(o);
})(h());
!function (o) {
	g(o), g(2);
}(h());
(function (o) {
	g(o);
})(h()), console.log("after");
var z = (function (o) {
	g(o);
})(h());
console.log(z);
(function* (o) {
	g(o);
})(h());
(function (o) {
	"use strict";
	g(this === undefined, o);
})(h());
var obj = {
	m: function () {
		!function (o) {
			g(this, o);
		}(h());
	}
};
obj.m();
var y = 5;
!function (o) {
	g(o, y);
}(y + 1);
(function (o) {
	g(o, o);
})(h());
