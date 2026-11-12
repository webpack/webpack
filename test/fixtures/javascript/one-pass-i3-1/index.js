function made(x) {
	var outer = x;
	return function () {
		return outer;
	};
}
function arrow(x) {
	var outer = x;
	return () => outer;
}
function declared(x) {
	var outer = x;
	function g() {
		return outer;
	}
	return [g, g];
}
function before(x) {
	var f = function () {
		return outer;
	};
	var outer = x;
	return [f, f];
}
console.log(made(1)(), arrow(2)(), declared(3)[0](), before(4)[1]());
