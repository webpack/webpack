function negate(g, f) {
	var x = -f();
	return g(-x);
}
function plus(f) {
	var x = +f();
	return +x;
}
function literal() {
	var x = -1;
	return -x;
}
function update(f) {
	var x = --f.a;
	return -x;
}
console.log(
	negate((a) => a, () => 1),
	plus(() => 2),
	literal(),
	update({ a: 3 })
);
