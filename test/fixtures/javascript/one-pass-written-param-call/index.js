console.log(
	(function (a) {
		return (a = 5);
	})(),
	(function () {
		var b;
		return (b = "set");
	})(),
	(function (c) {
		c = 7;
		return c;
	})(),
	(function (d) {
		return (d = d + 1);
	})()
);
