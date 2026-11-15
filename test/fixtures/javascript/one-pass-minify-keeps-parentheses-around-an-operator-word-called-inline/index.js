function f(a, b) {
	return (() => typeof (a + b))().length;
}
function h(a) {
	return (() => new (a.b())())().length;
}
console.log(f(1, 2));
console.log(h({ b: () => Array }));
