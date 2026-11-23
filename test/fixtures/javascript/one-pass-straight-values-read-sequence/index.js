// A sequence whose value is read folds the writes before its last item, a
// name or literal, as a statement's sequence does.
var a,
	c,
	b = ((a = 42), (c = 42), 42);
console.log(a === c, c === b, b === a);
function test(x) {
	var p,
		q = ((p = 1), x);
	if (((p = 2), q)) console.log(p, q);
	return p;
}
function kept(x) {
	var p,
		q = ((p = 1), p + x);
	return [p, q];
}
function called(x) {
	var p,
		q = ((p = 1), log(p), p);
	return [p, q, x];
}
function log(v) {
	console.log("log", v);
}
console.log(test(1), test(0), kept(4), called(5));
