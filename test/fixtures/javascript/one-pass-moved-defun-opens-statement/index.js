// A name set to a call returning a function declared there opens a statement
// as that function, which takes parentheses there.
var called = (function () {
	function inner() {
		console.log("called");
	}
	return inner;
})();
called();
var marked = (function () {
	function inner() {
		return 1;
	}
	return inner;
})();
marked.x = 2;
var tagged = (function () {
	function inner(parts) {
		console.log(parts[0]);
	}
	return inner;
})();
tagged`tag`;
var passed = (function () {
	function inner() {
		return 3;
	}
	return inner;
})();
console.log(passed());
