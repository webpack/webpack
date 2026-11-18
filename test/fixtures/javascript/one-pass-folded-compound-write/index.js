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
function plus(x) {
	return x + 1;
}
function written(t) {
	var i;
	i = plus(t);
	var o = (i += "").split(".");
	return o;
}
function writtenUnread(t) {
	var i;
	i = 1;
	return (i += "x");
}
function writtenDead(t) {
	var i;
	if (t) i = 2;
	return (i += "x");
}
console.log(
	written(1),
	writtenUnread(1),
	writtenDead(1),
	writtenDead(0),
	(function (p) {
		p = plus(1);
		return (p ^= 1);
	})(),
	(function (p) {
		p = 5;
		return (p ^= 1);
	})(),
	(function (p, q = (p = 4)) {
		return (p ^= 1);
	})(),
	(function (p) {
		early();
		return (p ^= 1);
		function early() {
			p = 7;
		}
	})(),
	(function () {
		var b;
		return (b |= 2);
		b = 4;
	})()
);
