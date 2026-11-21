// A call printed as its function's statements prints each parameter as the
// name passed, so that name must print as itself, not a value folded into it.
function fresh() {
	var c = {};
	!function (x) {
		console.log(typeof x, x === x);
	}(c);
}
function moved() {
	var c = function () {};
	!function (x) {
		console.log(typeof x);
	}(c);
}
function twice(y) {
	var c = [1];
	if (y)
		!function (x) {
			console.log(x, x === x);
		}(c);
	return 1;
}
var given = {},
	other = 2;
!function (x, y) {
	console.log(typeof x, y);
}(given, other);
fresh();
moved();
twice(1);
