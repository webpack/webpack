// A literal joined from assignments after it counts their length too.
function tested() {
	var o = {};
	if ((o.a = "PASS")) return o.a;
}
console.log(tested());
function summed() {
	var o = {};
	o.a = "PASS";
	return o.a + o.a;
}
console.log(summed());
function kept(x) {
	var o = {};
	o.a = "long value";
	o.b = 2;
	return [o.a, o.a, o.a, o.a, o.b, x];
}
console.log(kept(1));
function written() {
	var o = {};
	o.a = "PASS";
	o.a += "!";
	return o.a + o.a;
}
console.log(written());
