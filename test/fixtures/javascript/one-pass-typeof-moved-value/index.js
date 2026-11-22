// A `typeof` or `!` of a parameter printing as the value passed reads that value.
function f(a) {
	var a;
	return typeof a;
}
function g(a) {
	return typeof a;
}
function h(a) {
	return !a;
}
function k(a) {
	return typeof a;
}
console.log(f([]), g(function () {}), h({}), k(/x/));
function impure(a) {
	return typeof a;
}
console.log(
	impure(
		class {
			[(console.log("key"), "k")]() {}
		}
	)
);
function unset(a, b) {
	var a = b;
	return typeof a;
}
console.log(unset([]), unset(1, 2));
var listed = [function () {}];
console.log(typeof listed[0]);
var nested = [[function () {}]];
console.log(typeof nested[0][0]);
var held = [1, { k: 2 }];
console.log(held[0], typeof held[1]);
function first(x) {
	return typeof x[0];
}
console.log(first([1]), first(["s"]));
