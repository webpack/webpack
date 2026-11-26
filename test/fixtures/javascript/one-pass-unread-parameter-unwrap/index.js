// A function called in place as a statement prints as its statements where
// each parameter passed nothing, or passed a constant, is unread.
var log = console.log;
var c = 0;
function missing() {
	(function (unused) {
		(function (n) { log(n, c); })(NaN, c++);
	})();
}
missing();
missing();
function constant() {
	(function (unused, other) {
		(function (n) { log(n, c); })(0, c++);
	})(-3, -1);
}
constant();
constant();
function extra() {
	(function () { log("extra"); })(1, 2);
}
extra();
extra();
var getter;
function nested(v) {
	(function (p) {
		getter = function () { return (p = (p || 0) + 1); };
	})();
	log(getter(), v);
}
nested(1);
nested(2);
function rest() {
	(function (p, ...r) { log(r.length); })(1, 2);
}
rest();
rest();
