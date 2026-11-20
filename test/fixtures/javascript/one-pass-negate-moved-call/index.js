// A statement calling a function moved to its one read opens with `!`.
var o = { a: "PASS" };
(function () {
	function f() {
		var x = o;
		console.log(x.a);
	}
	f();
})();
(function () {
	function f() {
		var { a: x } = o;
		console.log(x);
	}
	f(), console.log("after");
})();
(function () {
	function f() {
		var x = o;
		return x.a;
	}
	f() ? console.log("truthy") : console.log("falsy");
})();
(function () {
	function named() {
		var x = named.name;
		console.log(x);
	}
	named();
})();
// A call printing in the place of an unread call opens no statement of its own.
(function (A) {
	(function () {
		doPrint();
	})();
	function doPrint() {
		print(A);
	}
})("Hello World!");
function print(A) {
	if (!A.x) {
		console.log(A);
	}
}
