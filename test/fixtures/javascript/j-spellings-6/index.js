function log2(v) {
	var r, shift;
	r = (v > 0xffff) << 4;
	v >>>= r;
	shift = (v > 0xff) << 3;
	v >>>= shift;
	r |= shift;
	return r | (v >> 1);
}
function keep(v) {
	var a = v + 1, b;
	b = a;
	var c, d = v;
	c = d;
	return [a, b, c, d];
}
console.log(log2(65536), keep(1));
