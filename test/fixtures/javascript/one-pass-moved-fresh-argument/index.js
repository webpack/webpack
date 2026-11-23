// A function moved to its one call makes the literal it is passed where its
// parameter is read, as a function written there does.
function kind(a) {
	return typeof a;
}
console.log(kind([]));
function first(list) {
	var list;
	return list.length;
}
console.log(first([1, 2]));
function picked(obj) {
	return obj.bar();
}
console.log(picked({ bar: function () { return 2; } }));
function called(fn) {
	return fn();
}
console.log(called(function () { return 42; }));
var x = "outer";
function hidden(fn) {
	var x = "inner";
	return fn();
}
console.log(hidden(function () { return x; }));
var n = 0;
function after(a, b) {
	return b + a.x;
}
console.log(after({ x: 1 }, n++), n);
