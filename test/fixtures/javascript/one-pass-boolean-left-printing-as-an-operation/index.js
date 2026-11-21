function g() {
	console.log("g");
	return 1;
}
function h(s) {
	return s.length - 1;
}
function sum(a, b) {
	return ((() => a + b)() || false) && g();
}
function less(a, b) {
	return ((() => a < b)() || false) && g();
}
function both(a, b) {
	return ((() => a && b)() || false) && g();
}
function bits(a, b) {
	return ((function () {
		return a | b;
	})() || false) && g();
}
function held(a, b) {
	var t = a + b;
	return (t || false) && g();
}
function quoted() {
	return (h('a"b') || false) && g();
}
function joined(a) {
	return ((() => a("x") + a("y"))() || false) && g();
}
console.log(sum(2, -2), less(2, 1), both(1, 0), bits(0, 0), held(2, -2));
console.log(quoted(), joined(function (s) { return s.length - 1; }));
