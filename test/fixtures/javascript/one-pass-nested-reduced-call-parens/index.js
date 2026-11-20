// A call printing as what a function it returns calls in place returns takes
// the parentheses that value needs where the outer call is.
var x = 0;
console.log(
	(function () {
		return (function () {
			return !x;
		})();
	})().toString()
);
console.log(
	(function () {
		return (function () {
			return x + 1;
		})();
	})() * 2
);
console.log(
	(function (a) {
		return (function (a) {
			return a === undefined;
		})();
	})(2)
);
console.log(
	(function () {
		return (function () {
			return (function () {
				return typeof console;
			})();
		})();
	})().length
);
console.log(
	(function () {
		return (function () {
			return 1.5;
		})();
	})().toFixed(2)
);
