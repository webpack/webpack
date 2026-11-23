var calls = 0;
function x() {
	return calls++ % 2;
}
function y() {
	console.log("y", a, typeof b);
}
function z() {
	console.log("z", b);
}
console.log(typeof a, typeof b);
if (x()) {
	var a;
	y();
} else {
	z();
	var b;
}
if (x()) {
	var a;
	y();
} else {
	var b, c;
	z();
}
console.log(a, b, c, calls);
