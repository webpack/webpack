// A call printing as its one statement prints its other parameters as what
// is passed: one passed a literal holding a name keeps the call.
var v = 1;
function g(a, b) {
	console.log(JSON.stringify(a), b);
}
function h() {
	return 2;
}
(function (a, b) {
	g(a, b);
})({ large: v }, h());
(function (a, b, c) {
	g(a, c);
})(h(), { large: v }, h());
(function (a, b) {
	g(a, b);
})(v, h());
