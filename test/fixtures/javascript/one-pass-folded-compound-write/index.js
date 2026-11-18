console.log(
	(function (a) {
		return (a ^= 1);
		a ^= 2;
	})(),
	(function () {
		var b = 2;
		return (b *= 3);
	})(),
	(function (c) {
		return (c += "x");
	})(),
	(function (d) {
		return [1, 2].map(function () {
			return (d ^= 1);
		});
	})(),
	(function (e) {
		for (var i = 0; i < 2; i++) e = (e ^= 1) + 1;
		return e;
	})(),
	(function (f) {
		return (f ^= 1);
	})(4),
	(function (g) {
		return arguments.length + (g ^= 1);
	})(),
	(function () {
		var h;
		return "n" + (h |= 8);
	})()
);
