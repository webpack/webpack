function f(a, b = 3) {
	console.log(a);
}
function g(a = 1, b, c = "x") {
	console.log(a);
}
function h(a, b = 1) {
	console.log(a, arguments.length);
}
function k(a, b = 1) {
	var b;
	console.log(a, b);
}
var o = {
	set x(v = 1) {},
	m(a, b = 2) {
		return a;
	}
};
f(1);
g();
h(1, 2);
k(1);
console.log(f.length, g.length, h.length, k.length, o.m.length, o.m(5));
