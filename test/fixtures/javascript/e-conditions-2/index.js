x = y ? 0 : 1;
x = !y ? 1 : 0;
x = y ? 1 : 0;
f(y ? 0 : 1);
x = (a || b) ? 0 : 1;
x ? a = 0 : a = 1;
function g(a, b) {
	a ? b = 0 : b = 1;
	return b;
}
function h(o, t) {
	t ? o.b = 0 : o.b = 1;
}
