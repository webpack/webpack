function b(name) {
	console.log(name);
}
function f(a, c) {
	if (a) return;
	if (c) return;
	b("f");
}
function g(a, c, d) {
	if (a) return;
	if (c) return;
	if (d) b("g");
}
f(0, 0);
f(1, 0);
f(0, 1);
g(0, 0, 1);
g(0, 1, 1);
g(0, 0, 0);
