// A value `(a=b,a)` printing as its assignment takes the parentheses that needs.
function returned(a, b) {
	var c = ((a = b), a);
	return c;
}
console.log(returned(1, 2));
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
function tested(a, b) {
	var c = ((a = b), a);
	return c ? "yes" : "no";
}
console.log(tested(1, 0));
function thrown(a, b) {
	var c = ((a = b), a);
	try {
		throw c;
	} catch (e) {
		return e;
	}
}
console.log(thrown(1, 3));
function member(a, b) {
	var c = ((a = { x: b }), a);
	c.y = 1;
	return a.x + a.y;
}
console.log(member(1, 4));
function kind(a, b) {
	var c = ((a = b), a);
	return typeof c;
}
console.log(kind(1, "s"));
