function make() {
	console.log("made");
	return 4;
}
function same(x) {
	return x;
}
var value;
value = make();
console.log(same(value));
function first(x, y) {
	return x;
}
var other = make();
console.log(first(other, 1), first(other, 2));
