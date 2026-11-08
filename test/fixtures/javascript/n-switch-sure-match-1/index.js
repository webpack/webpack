var log = [];
function f(v) { log.push(v); return v + 1; }
function a(foo) {
	switch (1) { case 1: f("x"); if (foo) break; f("y"); break; case 1 + 1: f("bar"); default: f("def"); }
}
// Past a case surely matching, none tests: those after are only fallen into.
function b() {
	switch (2) { case f(0): case f(1): f(2); case 2: case f(3): case f(4): f(5); }
}
// A `var` past the match is declared still.
function c(t) {
	switch (1) { case t(): f("at"); case 1: f("one"); break; default: f("d"); var q; }
	return typeof q;
}
a(0); a(1); b();
console.log(log.join(), c(function () { return 0; }));
