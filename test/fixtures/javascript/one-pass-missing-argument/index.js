console.log(function (a) {
	return a === undefined;
}());
console.log(function (a, b) {
	return a == b;
}(1));
console.log(function (a, b) {
	return a + b;
}(1));
console.log(function (a) {
	return arguments.length + (a === void 0);
}());
