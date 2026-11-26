// A call a comment marks pure goes with its callee where its arguments run,
// but a value a statement before it moved into the callee still runs.
function pick() {
	return Object;
}
function arg(n) {
	console.log("arg", n);
	return n;
}
/*@__PURE__*/ (String || Array)(arg(1), arg(2));
/*@__PURE__*/ new (String || Array)(arg(3));
// Kept: the callee reads a name declared here, whose read it would drop.
/*@__PURE__*/ (pick() || Array)(arg(4));
function made() {
	console.log("made");
	return function () {
		console.log("called");
	};
}
function moved() {
	var fn = made();
	/*@__PURE__*/ fn(1);
}
moved();
function movedOr() {
	var fn = made();
	/*@__PURE__*/ (fn || Math.min)();
}
movedOr();
