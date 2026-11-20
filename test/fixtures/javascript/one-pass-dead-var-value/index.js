function f() {
	return a;
	var a = 1;
}
function g() {
	console.log(b);
	return;
	var b = console.log("never");
}
function h(c) {
	if (c) return d;
	var d = 2;
	return d;
}
console.log(f(), f());
g();
g();
console.log(h(0), h(1));
