// An assignment of a statement's sequence folds into the item after it, or
// into the next statement once every item after it folded.
function sum(x, y) {
	var a, b, r = x + y;
	a = r * r - r, b = 7;
	return a + b;
}
console.log([1, 2].map(sum));
function logged(x) {
	var a = 1;
	a = [x], console.log(a);
}
[1, 2].forEach(logged);
function last(c) {
	var a;
	if (c) {
		a = [c], console.log(a);
	}
}
last(3);
last(0);
// A value running code stays before what may run code ahead of its read.
var order = [];
function g() {
	order.push("g");
	return 1;
}
function h() {
	order.push("h");
	return 2;
}
function both() {
	var a, b;
	a = g(), b = h(), console.log(b, a);
}
both();
both();
console.log(g(), h(), order.join());
// Read again, or by a closure, a name keeps its write.
function twice(n) {
	var a;
	a = [n], console.log(a, a);
	return a;
}
console.log([3, 4].map(twice));
function closed(n) {
	var a;
	a = [n], console.log(function () { return a; }());
	return a;
}
console.log([5, 6].map(closed));
// A first item opening with a moved function keeps its own statement.
function wrap(o) {
	var i = {};
	verb("next");
	return i;
	function verb(n) {
		i[n] = function (v) {
			v = o[n](v), settle(v.done, v.value);
		};
	}
	function settle(d, v) {
		console.log(d, v);
	}
}
wrap({ next: function (v) { return { done: false, value: v }; } }).next(1);
