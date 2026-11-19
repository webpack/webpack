// An assignment folds past a callee or a left side running nothing, and the
// one before it then folds too.
function sum(x, y) {
	var a, b, r = x + y;
	a = r * r - r;
	b = 7;
	return a + b;
}
console.log([1, 2].map(sum));
function logged(x) {
	var a = 1;
	a = [x];
	console.log(a);
}
[1, 2].forEach(logged);
// A value running code stays before a call it would pass.
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
	a = g();
	b = h();
	return b + a;
}
console.log([0, 1].map(both), g(), h(), order.join());
// Read again, or by a closure, a name keeps its write.
function twice() {
	var a = 1;
	a = 0;
	console.log(a, a);
}
twice();
twice();
function closed(n) {
	var a = 1;
	a = n;
	console.log(function () { return a; }());
	return a;
}
console.log([3, 4].map(closed));
