// A read of a global nothing declares may throw: what a catch, a closure or
// an outer function reads after it was set before that read.
var calls = 0;
function g() {
	calls++;
	return calls;
}
function caught() {
	var a = 0;
	try {
		a = g();
		missingCallee(a);
	} catch (e) {
		return a;
	}
}
console.log(caught(), caught());
function caughtItems() {
	var a = 0;
	try {
		a = g(), missingCallee(a);
	} catch (e) {
		return a;
	}
}
console.log(caughtItems(), caughtItems());
function closed() {
	var a = 0;
	var read = function () {
		return a;
	};
	try {
		(function () {
			a = g();
			missingCallee(a);
		})();
	} catch (e) {}
	return read();
}
console.log(closed(), closed());
var outer = 0;
function setsOuter() {
	outer = g();
	missingCallee(outer);
}
try {
	setsOuter();
} catch (e) {}
console.log(outer);
// Read nowhere after, a local still folds past it.
function folds(x) {
	var a;
	a = [x];
	return typeof missingCallee == "function" ? missingCallee(a) : a;
}
console.log(folds(1), folds(2));
// A known global's read throws nothing: a value folds past it as before.
function every(step) {
	step = Math.floor(step);
	return !isFinite(step) ? null : function (n) {
		return n * step;
	};
}
console.log(every(2.5)(3), every(Infinity));
