function x() {
	return 1;
}
var foo, x, y;
foo = !(x(), y);
function f(g) {
	var a, b, c;
	b = a;
	a = g(c);
	return [a, b, c];
}
console.log(foo, y, f(String));
