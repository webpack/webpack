(function () {
	function id(x) {
		return x;
	}
	console.log(id(1), id("two"));
})();
(function () {
	function first(x, y = 42) {
		return x;
	}
	console.log(first(1) + first(2));
})();
(function () {
	function same(x) {
		return x;
	}
	var o = {};
	console.log(same(o) === o, same());
})();
(function () {
	function writes(x) {
		x = 3;
		return x;
	}
	console.log(writes(1));
})();
(function () {
	function second(x, y) {
		return y;
	}
	console.log(second(1));
})();
