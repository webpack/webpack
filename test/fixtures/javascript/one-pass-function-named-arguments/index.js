// A function declaration named `arguments` replaces its function's arguments object.
function declared() {
	function arguments() {}
	return typeof arguments;
}
function read(a) {
	var first = arguments[0];
	function arguments() {}
	return [first, a];
}
function param(arguments) {
	function arguments() {}
	return typeof arguments;
}
function set() {
	arguments = 2;
	function arguments() {}
	return typeof arguments;
}
function redeclared() {
	var arguments;
	function arguments() {}
	return typeof arguments;
}
function nested() {
	{
		function arguments() {}
	}
	return typeof arguments;
}
// A default reads the object its own scope holds.
function defaulted(a = arguments) {
	function arguments() {}
	return a.length;
}
console.log(declared(), read(1), param(1), set(), redeclared(), nested());
console.log(defaulted(), defaulted(void 0, 2));
