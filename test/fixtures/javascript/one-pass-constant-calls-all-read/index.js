// A function only called prints its value at each call, its declaration gone.
function x() {}
function y() {
	return "foo";
}
console.log((x() || true) || y());
console.log((y() || true) && x());
console.log((x() && false) || y());
console.log((x() || false) && y());
console.log(x(), typeof x(), [y()], y().length);
// A read but a call, a write, or a value too long keeps the function.
function held() {
	return "held";
}
var h = held;
console.log(held(), held(), h());
function written() {
	return "w";
}
console.log(written(), written());
written = 1;
function long() {
	return "a long string";
}
console.log(long(), long(), long(), long());
