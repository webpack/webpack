// A sequence folding to the literal it ends in prints that literal where its
// name was read, bare but for a number a member is read off.
function added(a, b) {
	var c = ((a = b), a);
	return c + 1;
}
console.log(added(1, 2));
function negated(a, b) {
	var c = ((a = b), a);
	return !c;
}
console.log(negated(1, 0));
function fixed(a, b) {
	var c = ((a = b), a);
	return c.toFixed(1);
}
console.log(fixed(1, 2));
function measured(a, b) {
	var c = ((a = b), a);
	return c.length;
}
console.log(measured(1, "ab"));
function kind(a, b) {
	var c = ((a = b), a);
	return typeof c;
}
console.log(kind(1, "s"));
