function f(o, e) {
	if (e) o(x);
	else o(y);
}
function g(o, e) {
	if (e) {
		o(x, 1);
	} else {
		o(y, 1);
	}
	h();
}
function k(o, e) {
	e ? new o(1) : new o(2);
	if (e) new o(1);
	else new o(2);
}
function l(o, e) {
	if (e()) o(x);
	else o(y);
	if (e) o(x)(1);
	else o(y)(1);
	if (e) o(h(), x);
	else o(h(), y);
}
