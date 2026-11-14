function f() {
	var q = String(Math.random() < 2);
	console.log(q, q);
}
function g(a) {
	f();
	console.log(a, a);
	return a;
}
console.log(g("A"));
console.log(g("B"));
