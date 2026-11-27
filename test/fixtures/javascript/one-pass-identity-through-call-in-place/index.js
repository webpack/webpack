const id = (a) => (function () {
	return a;
})();
const undef = (a) => ((a) => a)();
const five = (a) => (() => 5)();
const nothing = (a) => (function () {})();
function named(a) {
	return (function a() {
		return a;
	})();
}
function own(a) {
	return (function () {
		return this;
	})();
}
var g = 1;
const global = (a) => (() => g)();
g = 2;
console.log(id(1), id("x"), undef(3), undef(4), five(1), five(2));
console.log(nothing(1), nothing(2), typeof named(1), typeof named(2));
console.log(typeof own(1), typeof own(2), global(1), global(2));
