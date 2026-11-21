// A write that goes prints its value, which then folds where it is read.
function declared() {
	function g() {}
	return (g = 0), !!g;
}
console.log(declared());
function local() {
	var g;
	return (g = 0), !!g;
}
console.log(local());
console.log(
	(function () {
		var g;
		return (g = 0), !!g;
	})()
);
function negated() {
	var g;
	return !(g = 0);
}
console.log(negated(), negated().toString());
function added() {
	var g;
	return (g = 1) + 1;
}
console.log(added());
// A name read keeps its write; `eval` may read it.
function read() {
	function g() {}
	var r = g;
	g = 1;
	return [typeof r, typeof g];
}
console.log(read());
function evaluated() {
	function g() {}
	eval("");
	g = 0;
	return !!g;
}
console.log(evaluated());
