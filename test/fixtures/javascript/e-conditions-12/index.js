function f(a, b, c) {
	x = a != null ? a : b ?? c;
	x = a != null ? a : b ?? c.d;
	x = a != null ? a : b() ?? c;
}
function g(a, b, c) {
	return a != null ? a : b != null ? b : c;
}
