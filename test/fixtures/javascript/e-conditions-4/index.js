a ? b : a;
x = a ? (b, c) : a;
x = a ? b || c : a;
x = a ? function () {}() : a;
function f(a) {
	return a ? b : a;
}
