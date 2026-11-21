// A local each write sets to a known value folds through a `return` or
// `throw` setting it, and at a private top level as in a function.
var a = 2;
a = 3 / a;
console.log(a);
var c = 1;
c++;
c += 2;
console.log(c);
function divide() {
	var b = 2;
	return (b = 3 / b);
}
function scale() {
	var b = 2;
	throw (b = b * 3);
}
function kept() {
	var b = 2;
	try {
		return (b = 3);
	} finally {
		console.log(b);
	}
}
function* steps() {
	var b = 1;
	yield b;
	return (b = b + 1);
}
var it = steps();
console.log(divide(), divide(), kept(), it.next().value, it.next().value);
try {
	scale();
} catch (e) {
	console.log(e);
}
