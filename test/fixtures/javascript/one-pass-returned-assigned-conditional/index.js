// `return x=v,x` returns `v` whole, though nothing reads the write.
function f(a, g, u, x) {
	return (x = g(a) >= 0 ? 1 : 2), x;
}
function either(g, x) {
	return (x = g() || 2), x;
}
// `f` is what `h` prints as once.
function h(a, g, u, x) {
	if (((u = g(a)), u >= 0)) x = 1;
	else x = 2;
	return x;
}
function folded(g, x, b) {
	return x(((b = g() ? 1 : 2), [b]));
}
function same(n) {
	return n;
}
function zero() {
	return 0;
}
[same, zero].forEach(function (g) {
	console.log(f(1, g), either(g), h(1, g), folded(g, same));
});
console.log(f(2, same), either(same), h(2, same), folded(same, same));
