var o = { a: 1, b: 2 };
console.log(
	(function (c) {
		return { x: c.a, y: c.b };
	})(o)
);
var p = { a: 1, b: 2 };
console.log(
	(function (c, d) {
		return c.a + d.b;
	})(p, p)
);
var q = { a: 1, b: 2 };
console.log(
	(function (c) {
		return c.a + c.b;
	})(q),
	q
);
var r = { a: 1, b: 2 };
console.log(
	(function (c) {
		arguments[0] = { a: 9 };
		return c.a;
	})(r)
);
var s = { a: 1, b: 2 };
console.log(
	(function (c) {
		c.a = 5;
		return c.a + c.b;
	})(s)
);
var t = { a: -1, b: 2 };
console.log(
	-(function (c) {
		return c.a;
	})(t)
);
try {
	console.log(
		(function (c) {
			return c.a + c.b;
		})(u)
	);
} catch (e) {
	console.log("unset");
}
var u = { a: 1, b: 2 };
var v = { a: 1, b: 2 };
function pick(c) {
	return c.a + c.b;
}
console.log(pick(v));
var w = { a: 1, b: 2 };
(function (c) {
	console.log(c.a, c.b);
})(w);
console.log(w.a);
var x = { a: 1, b: 2 };
console.log(
	(function (c, d) {
		return c.a + d;
	})(x, x.b)
);
