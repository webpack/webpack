// A call two branches set an unread name to merges as the call alone would.
function make(v) {
	return [v];
}
function viaIf(x, c) {
	if (c) {
		x = make(1);
	} else {
		x = make(2);
	}
}
function viaVar(c) {
	var x;
	if (c) x = new make(1);
	else x = new make(2);
}
function viaConditional(x, y, c) {
	c ? (x = make(1)) : (y = make(2));
}
function viaReturn(x, c) {
	if (c) return (x = make(1));
	else return (x = make(2));
}
function viaThrow(x, c) {
	if (c) throw (x = make(1));
	else throw (x = make(2));
}
function asCallee(x, c) {
	return (c ? (x = make) : (x = make))(3);
}
function inOperand(x, c) {
	return (c ? (x = make(1)) : (x = make(2))) + "";
}
function runsFirst(x, c) {
	if (c) x = make(log("a"), 1);
	else x = make(log("a"), 2);
}
function readAfter(x, c) {
	if (c) x = make(1);
	else x = make(2);
	return x;
}
var seen = [];
function log(v) {
	seen.push(v);
	return v;
}
viaIf(0, 1);
viaVar(0);
viaConditional(0, 0, 1);
runsFirst(0, 0);
console.log(viaReturn(0, 1), inOperand(0, 0), asCallee(0, 1), readAfter(0, 0), seen);
try {
	viaThrow(0, 1);
} catch (e) {
	console.log(e);
}
