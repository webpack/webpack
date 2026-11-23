var a, c;
console.log(
	(function () {
		return function () {
			if (a) return b;
			if (c) return d;
		};
	})()()
);
console.log(
	(function () {
		return () => {};
	})()(),
	(function () {
		return async () => {};
	})()() instanceof Promise
);
var later;
console.log((later = function () {})(), typeof later);
function keep() {
	var f;
	return [(f = function () {})(), typeof f];
}
console.log(keep());
