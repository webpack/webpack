console.log(function (a) {
	return a === undefined;
}());
console.log(function (a, b) {
	return a == b;
}(1));
console.log(2, function (a) {
	return function (a) {
		return a !== void 0;
	}();
}(2));
console.log(function (a, b) {
	return a + b;
}(1));
console.log(function (a) {
	a = 1;
	return a === void 0;
}());
console.log(function (a) {
	return arguments.length + (a === void 0);
}());
