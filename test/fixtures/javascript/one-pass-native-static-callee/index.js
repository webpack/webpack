function square(a) {
	var b = Math.abs(a);
	return Math.pow(b, 2);
}
function larger(a, g) {
	var b = g(a);
	return Math.max(b, 2);
}
function code(a, g) {
	var b = g(a);
	return String.fromCharCode(b);
}
function shadowed(a, g) {
	var Math = {
		max: function () {
			return "local";
		}
	};
	var b = g(a);
	return Math.max(b, 2);
}
function unknown(a, g) {
	var b = g(a);
	return Math.unknown ? Math.unknown(b) : b;
}
function replaced(a) {
	var b = Math.abs(a);
	return Math.round(b);
}
var twice = function (v) {
	return v * 2;
};
console.log(square(-3), larger(5, twice), code(33, twice), shadowed(1, twice));
console.log(unknown(4, twice));
console.log(
	replaced({
		valueOf: function () {
			Math.round = function () {
				return "replaced";
			};
			return 2;
		}
	})
);
