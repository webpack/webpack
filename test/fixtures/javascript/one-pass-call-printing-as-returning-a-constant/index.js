var seen = [];
function a() {
	seen.push("a");
}
function b() {
	seen.push("b");
}
function pick(foo) {
	switch (foo) {
		case "bar":
			return "PASS";
		default:
			return "FAIL";
	}
}
console.log(pick("bar"));
console.log(
	(function (x, y, z) {
		if (x) return y;
		return z;
	})(1, 2, 3)
);
console.log(
	(function (x, y) {
		return x * y;
	})(2, 3, a(), b())
);
var list = [
	(function () {
		if (1) return "listed";
		return "not";
	})()
];
var object = {
	key: (function (flag) {
		return flag ? null : 1;
	})(true)
};
console.log(list, object, seen.join());
console.log(
	(function () {
		return 1;
	})().toFixed(1)
);
