var v = [0, -0, 1, -7, NaN, Infinity, null, undefined, true, "", "foo", /foo/];
v.forEach(function (x) {
	v.forEach(function (y) {
		console.log(+(x * y), +(x / y), +(x % y), -(x * y), -(x / y), -(x % y));
	});
});
function written(x, y) {
	var set = function () {
		y = 5;
	};
	x.set = set;
	console.log(-(x * y), -(x % y));
}
written({ valueOf() { this.set(); return 3; } }, 2);
function mapped(x, y) {
	console.log(-(x * y), arguments.length);
}
mapped(2, 3);
function dead(x, a = -(x * y), y) {
	return a;
}
try {
	dead({ valueOf() { console.log("valueOf"); return 1; } });
} catch (e) {
	console.log(e.name);
}
var outer = 3;
console.log(
	(function (x, y) {
		return [-(x * y)];
	})({ valueOf() { outer = 7; return 1; } }, outer)
);
function big(x, y) {
	try {
		console.log(-(x * y), +(x * y));
	} catch (e) {
		console.log(e.name);
	}
}
big(BigInt(2), BigInt(3));
big(BigInt(2), 3);
