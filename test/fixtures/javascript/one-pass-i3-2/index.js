function nested(x) {
	var y = g(x);
	return [[3], [y, x]];
}
function holes(x) {
	var y = g(x);
	return [[, 1], y];
}
function spread(x) {
	var y = g(x);
	return [[...x], y];
}
function call(x) {
	var y = g(x);
	return [[h()], y];
}
function g(v) {
	return v + 1;
}
function h() {
	return 0;
}
console.log(nested(1), holes(2), spread([3]), call(4));
