function h(a, v) {
	console.log(a, v);
}
function f(a) {
	var v = (arguments[0] = 2);
	h(a, v);
}
f(1);
function k(a) {
	var v = (arguments.length = 2);
	h(a, v);
}
k(1);
