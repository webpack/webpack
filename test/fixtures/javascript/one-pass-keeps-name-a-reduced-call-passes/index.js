// A literal passed to a call printing as the value it returns stays a name.
function picked() {
	var o = { a: 1, b: 2 };
	return (function (c) {
		return { x: c.a, y: c.b };
	})(o);
}
console.log(JSON.stringify(picked()));
var p = { a: 3, b: 4 };
console.log(JSON.stringify((function (c) { return [c.a, c.b]; })(p)));
function once() {
	var o = { a: 5 };
	return (function (c) { return c.a; })(o);
}
console.log(once());
function more() {
	var o = { a: 6, b: 7 };
	return (function (c) { console.log(c.a); return c.b; })(o);
}
console.log(more());
function arrow() {
	var o = [8, 9];
	return ((c) => c[0] + c[1])(o);
}
console.log(arrow());
