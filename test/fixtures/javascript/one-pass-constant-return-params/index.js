// A function taking plain parameters and returning a constant prints as what
// its arguments run, then the constant.
function f() {
	console.log("f");
	return 3;
}
function g(a) {
	var a = 42;
	return typeof a;
}
console.log(g([]));
function two(a, b) {
	var a = 1;
	return "k";
}
console.log(two(f(), f()));
var o = {
	get x() {
		console.log("get");
		return 1;
	}
};
function read(a) {
	var a = 2;
	return 5;
}
console.log(read(o.x));
console.log(
	(function (a) {
		return 1;
	})(f()),
	(a => 2)(f()),
	((a, b) => 3)(f(), f())
);
function spread(a) {
	var a = 1;
	return 0;
}
console.log(spread(...[1, 2]));
var a = 42;
(function (a) {
	console.log(a());
})(function () {
	return a;
});
(function (b) {
	console.log(b(console.log("argument")));
})(function (x) {
	return 7;
});
(function (b) {
	console.log(b.call(null));
})(function () {
	return 9;
});
(function (b) {
	var r = b();
	b = null;
	console.log(r);
})(function () {
	return 5;
});
