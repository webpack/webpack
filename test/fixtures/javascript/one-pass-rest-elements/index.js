var log = [];
function show(x) {
	log.push(x);
}
(function (a, ...b) {
	show(b[0]);
	show(b[1] + 1);
})(1, 2, "x");
console.log(
	(function (...b) {
		return b[1];
	})(3, 4),
	(function (a, ...b) {
		return function () {
			return a + b[0];
		};
	})(5, 6)()
);
(function (a, ...b) {
	show(b[0]);
	b[0] = 7;
	show(b[0]);
})(1, 2);
(function (a, ...b) {
	show(b.length);
	show(b[0]);
})(1, 2, 3);
(function (...b) {
	show(b[3]);
})(1);
(function (a, ...b) {
	show(b[0]);
})(1, 8, show(9));
function power(n) {
	return (function (...r) {
		return r[0] ** n;
	})(-2);
}
show(power(3));
console.log(log.join());
