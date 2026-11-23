var e = [];
var a = {
	b: function () {
		return this === a ? "a" : "other";
	}
};
function h() {
	e.push("h");
}
function f1() {
	var t;
	(t = (h(), 1)), e.push("x");
}
function f2(v) {
	var t;
	return 1 + (t = (h(), v));
}
function f3(v) {
	var t;
	if ((t = (h(), v))) return "t";
	return "f";
}
function f4(o) {
	var t;
	return (t = (o, a.b))();
}
function f5(o, flag, step) {
	var t;
	if ((t = (o, flag))) step(1);
	else step(2);
}
function f6(o, flag) {
	var t;
	return (t = (o, flag)) ? "y" : "n";
}
function f7() {
	var t;
	t = (function () {
		e.push("fn");
	})();
}
f1();
console.log(f2(2), f3(0), f3(1), f4(1), f6(1, 0), f6(1, 1));
f5(1, 0, function (v) {
	e.push("s" + v);
});
f7();
console.log(e.join());
