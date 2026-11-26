// A function called in place nobody reads, right of `&&` or `||` or a branch
// of `?:`, prints its statements there, in parentheses but where tight.
var log = console.log;
function single(x, y) {
	x && (function (a, b) { log(a, b); })(x, y);
}
single(1, 2);
single(0, 3);
function many(x) {
	x && (function () { log("a"); log("b"); })();
	x || (function () { log("c"); log("d"); })();
}
many(1);
many(0);
function branches(x) {
	x ? (function () { log(1); })() : (function () { log(2); log(3); })();
}
branches(1);
branches(0);
function guarded(x, y) {
	x && (function () { if (y) return; log(4); log(5); })();
}
guarded(1, 0);
guarded(1, 1);
function returned(x) {
	x && (function () { log(6); return 7; })();
	return x && (function () { log(8); return 9; })();
}
log(returned(1), returned(0));
function passed(x, y) {
	var n = 0;
	x && (function (z) { log(z); n++; })(y());
	return n;
}
log(passed(1, function () { return 10; }), passed(0));
function kept(x) {
	x && (function () { log(this === undefined, arguments.length); })(1);
	x && (function () { var q = x + 1; log(q); log(q); })();
}
kept(1);
kept(0);
