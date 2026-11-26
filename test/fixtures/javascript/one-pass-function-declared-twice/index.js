// Of the functions a list declares twice, the last alone sets the name.
function f() {
	return "FAIL";
}
console.log(f());
function f() {
	return "PASS";
}
(function () {
	function g() {
		return h();
	}
	function h() {
		return 1;
	}
	function g() {
		return 7;
	}
	console.log(g());
})();
console.log(
	(function (a) {
		function a() {
			return 1;
		}
		function a() {
			return 2;
		}
		return a();
	})("x")
);
// A block's function or a `var` of the name keeps the one binding.
(function () {
	function k() {
		return 1;
	}
	if (k) {
		function k() {
			return 2;
		}
	}
	console.log(k());
	function k() {
		return 3;
	}
})();
(function () {
	var q = 1;
	function q() {}
	function q() {}
	console.log(typeof q);
})();
