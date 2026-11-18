// An `in` a reduced call returns keeps its parentheses in a `for` head's start.
function moved(key, obj) {
	var o = { p: function () { return key in obj; } };
	for (var found = o.p(); found; ) return 1;
	return 0;
}
console.log(moved("a", { a: 1 }));
function invoked(key, obj) {
	for (var found = (function () { return key in obj; })(); found; ) return 1;
	return 0;
}
console.log(invoked("b", { a: 1 }));
var seen;
function prefixed(key, obj) {
	for (var found = (function () { seen = key in obj; return 1; })(); found; ) return seen;
	return 0;
}
console.log(prefixed("a", { a: 1 }));
