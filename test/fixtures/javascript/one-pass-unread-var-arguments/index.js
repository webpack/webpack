// A sloppy function's `var arguments` nothing reads goes, its value kept where it runs something.
function outer() {
	var arguments = 5;
	(function () {
		console.log(arguments.length);
	})(7, 1);
}
outer();
outer();
function effect(log) {
	var arguments = log("effect");
	log("after");
}
effect(console.log);
effect(console.log);
function read() {
	var arguments = 6;
	return arguments;
}
console.log(read(), read(1));
function nested() {
	var arguments = 7;
	return function () {
		return arguments;
	};
}
console.log(nested()(1).length, nested()(1, 2).length);
