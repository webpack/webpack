console.log(function (o = void 0) {}());
console.log(((o = void 0) => {})());
(function (o = void 0) {
	console.log("body");
})();
var five = (function (a, o = void 0) {
	return a;
})(5);
console.log(five);
function g(a, b = void 0) {
	return a;
}
console.log(g(1), g.length);
console.log(function (o = void console.log("default")) {}());
console.log(function (o = void 0) {
	return arguments.length;
}(1, 2));
console.log(function (o = -1) {}());
