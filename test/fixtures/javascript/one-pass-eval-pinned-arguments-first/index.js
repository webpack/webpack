var p = 1;
(function (x) {
	console.log(x);
})(p, eval("p = 2"));
function f() {
	var q = 1;
	(function (x) {
		console.log(x);
	})(q, eval("q = 2"));
}
f();
function h() {
	var s = 1,
		o = {};
	with (o) {
		(function (x) {
			console.log(x);
		})(s, (o.s = 2));
	}
}
h();
