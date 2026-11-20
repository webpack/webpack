console.log(
	(function (a, b) {
		a += b;
		return a;
	})(1, 2),
	(function (a) {
		return (a += 2);
	})(1),
	(function (a) {
		a += "x";
		return a;
	})("y"),
	(function (a) {
		a -= 1;
		return a;
	})(null),
	(function (a, b) {
		a *= b;
		return a;
	})(2)
);

console.log(
	(function (a) {
		a += 1;
		return arguments[0];
	})(1),
	(function (a) {
		const read = function () {
			return a;
		};
		a += 1;
		return read() + a;
	})(1),
	(function (a, b) {
		a += b;
		return a;
	})({
		valueOf: function () {
			return 5;
		}
	}, 1),
	(function f(a, n) {
		a += 1;
		return n ? f(5, 0) + a : a;
	})(1, 1)
);

function loop(a) {
	for (var i = 0; i < 2; i++) a += 1;
	return a;
}
console.log(loop(1));
