// The last declarator of a name its list alone declares sets what the read sees.
function last(b) {
	var a = 5, a = 1, a = 3;
	return -a + b;
}
console.log([1, 2].map(last));
function passed(x) {
	var a = 3, a = x;
	return a;
}
console.log(["x", "y"].map(passed));
// An earlier value that runs code keeps them.
var calls = 0;
function effect() {
	calls++;
	return "early";
}
function kept(x) {
	var a = effect(), a = x;
	return a + "!";
}
console.log(["late", "later"].map(kept), calls);
// Declared again in another statement, a name keeps its declarators.
function again(flag) {
	var a = 1, a = 2;
	if (flag) var a = 3;
	return a;
}
console.log([0, 1].map(again));
// Read by another declarator or a closure, it keeps them too.
function chained(x) {
	var a = x, a = a + 1;
	return a;
}
console.log([1, 2].map(chained));
function closed(g) {
	var a = 1, f = function () { return a; }, a = 2;
	return g(f) + g(f);
}
console.log([function (f) { return f(); }, function (f) { return f() + 1; }].map(closed));
