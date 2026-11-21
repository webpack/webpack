console.log(
	(function () {
		var o = { p: 3 };
		return (o.q = /foo/), (o.r = "bar");
	})()
);
console.log(
	(function () {
		var o = { q: /a/g, r: "x" };
		return o.r + o.r;
	})()
);
console.log(
	(function () {
		var o = { q: /a/g, r: "x" };
		o.q.lastIndex = 1;
		return o.r + o.q.lastIndex;
	})()
);
