// A function a body declares over a plain parameter takes every read of it.
var printTest = (function (ret) {
	function ret() {
		console.log("Value after override");
	}
	return ret;
})("Value before override");
printTest();
console.log(
	(function (a, b) {
		function a() {
			return b;
		}
		return a();
	})("x", "y")
);
// `arguments`, `eval`, defaults and twice declared keep the one binding.
console.log(
	(function (a) {
		function a() {
			return 1;
		}
		return typeof arguments[0];
	})("x")
);
console.log(
	(function (a) {
		function a() {
			return 1;
		}
		return eval("typeof a");
	})("x")
);
console.log(
	(function (a, b = a) {
		function a() {
			return 1;
		}
		return [typeof a, b];
	})("x")
);
console.log(
	(function (a) {
		var a;
		function a() {
			return 2;
		}
		function a() {
			return 3;
		}
		return a();
	})("x")
);
console.log(
	(function (a) {
		if (a) {
			function a() {
				return 1;
			}
		}
		return typeof a;
	})("x")
);
console.log(
	(function (a, b) {
		function a() {
			return 1;
		}
		function b() {
			return 2;
		}
		function a() {
			return 3;
		}
		return a() + b();
	})(0, 0)
);
console.log(
	(function (p1, p2, p3, p4, p5, p6, p7, p8, p9) {
		function p9() {
			return p1 + p8;
		}
		return p9();
	})(1, 0, 0, 0, 0, 0, 0, 2, 0)
);
