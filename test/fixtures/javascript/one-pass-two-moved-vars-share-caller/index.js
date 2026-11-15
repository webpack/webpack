function f() {
	var q = String(Math.random() < 2);
	console.log(q, q);
}
function h() {
	var r = String(Math.random() > 2);
	console.log(r, r);
}
function g(a) {
	f();
	h();
	console.log(a, a);
	return a;
}
console.log(g("A"));
console.log(g("B"));
