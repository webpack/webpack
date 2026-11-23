// A name an array of literals collapses into reads that array's length.
var pair = [1, 2];
console.log(pair.length);
var holes = [1, , 3, ,];
console.log(holes["length"]);
// An element running code, or a write between, keeps the read.
function side() {
	console.log("side");
	return 0;
}
var called = [side(), 2];
console.log(called.length);
var pushed = [1, 2];
pushed.push(3);
console.log(pushed.length);
function later() {
	var inner = [1, 2, 3];
	return inner.length;
}
console.log(later());
