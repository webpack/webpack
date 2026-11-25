console.log(
	function () {
		return "PASS";
	}.call()
);
console.log(
	function (a, b) {
		return a + b + arguments.length;
	}.call(0, 1, 2)
);
console.log(
	function () {
		return typeof this;
	}.call(1)
);
console.log(
	function () {
		return eval("typeof this");
	}.call(1)
);
console.log(
	function () {
		return (() => typeof this)();
	}.call(1)
);
console.log(
	function (x = typeof this) {
		return x;
	}.call(1)
);
console.log(
	function () {
		return function () {
			return typeof this;
		}();
	}.call(1)
);
var n = 0;
console.log(
	function () {
		return n++;
	}.call(null),
	n
);
console.log(
	function () {
		return arguments.length;
	}.call(console, 1)
);
console.log(
	function () {
		return arguments.length;
	}.call(...[1, 2])
);
(function (a, b) {
	for (var key in { a: 1 }) console.log(key, a, b);
}).call(0, 1, 2);
