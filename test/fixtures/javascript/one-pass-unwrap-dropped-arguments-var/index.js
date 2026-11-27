var outer = function () {
	var k = 7,
		arguments = 5,
		inner = function () {
			console.log(arguments.length, arguments[0]);
		};
	inner(k, 1);
};
outer(3);
(function () {
	var count = 1,
		arguments = 2;
	console.log(count);
})(4);
(function () {
	var arguments = 5;
	console.log(arguments);
})(1, 2);
(function () {
	var arguments = [9];
	(function () {
		console.log(arguments[0]);
	})(3);
})();
function wrapper() {
	(function () {
		var value = 1,
			arguments = 2;
		console.log(value);
	})();
	console.log(arguments.length);
}
wrapper(1, 2, 3);
