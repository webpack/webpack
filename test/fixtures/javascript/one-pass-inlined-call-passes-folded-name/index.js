function make() {
	console.log("made");
	return 3;
}
function show(x) {
	console.log(x);
}
var value = [make()];
show(value);
var unset;
(function (x) {
	console.log([x]);
})(unset);
(function () {
	function twice(x) {
		console.log(x, x);
	}
	var inner;
	twice(inner);
})();
