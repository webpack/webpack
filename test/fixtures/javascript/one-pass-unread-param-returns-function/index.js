var a;
console.log(
	(function (unused) {
		return function () {
			if (a) return 1;
		};
	})()()
);
console.log(
	(function (u) {
		return function () {
			return eval("u");
		};
	})(5)()
);
console.log(
	(function (u) {
		return function () {
			return arguments.length;
		};
	})(1)(2, 3)
);
var outer = "outer";
console.log(
	(function (outer) {
		return function () {
			return typeof outer;
		};
	})()()
);
var n = 0;
function f() {
	n++;
	return 1;
}
console.log(
	(function (u) {
		return function () {
			return n;
		};
	})(f())(),
	n
);
