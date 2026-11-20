function typed(a) {
	var a = 42;
	return typeof a;
}
function copied(a, b) {
	var a = b;
	return typeof a;
}
function set(a, b) {
	a = String(b);
	return a;
	var a;
}
function mapped(a) {
	var a = 1;
	return a + arguments[0];
}
function defaulted(a = 2, f = function () {
	return a;
}) {
	var a = 1;
	return [a, f()];
}
function effect(a, b) {
	var a = console.log("effect");
	return b;
}
console.log(typed([]), typed(), copied([]), copied(1, "x"), set(3, 4), set());
console.log(mapped(5), mapped(), defaulted(), defaulted(3), effect(1, 2), effect());
console.log(
	(function (c) {
		c = 5;
		return c;
		var c;
	})(),
	(function (a) {
		var a;
		return JSON.stringify(a);
	})([1])
);
