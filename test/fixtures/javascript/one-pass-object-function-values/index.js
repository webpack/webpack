function folded() {
	var o = { p: 1, u: function () { return this === this; } };
	console.log(o.p, o.p);
}
folded();

function foldedArrow() {
	var o = { a: "x", f: (y) => y + 1, b: 2 };
	console.log(o.a, o.b);
}
foldedArrow();

function keptForCall() {
	var o = { a: 1, f: function () { this.a = 2; } };
	o.f();
	console.log(o.a);
}
keptForCall();

function keptForEscape() {
	var o = { a: 1, f: function () { return o; } };
	console.log(o.a, o.f().a);
}
keptForEscape();

function keptForWrite() {
	var o = { a: 1, f: () => { o.a = 3; } };
	var h = o.f;
	h();
	console.log(o.a);
}
keptForWrite();
