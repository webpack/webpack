// Unless `pure_conversions` is false no `valueOf` or `toString` runs, as
// terser and swc assume, so an unread operation drops; a bigint mix may throw.
function unread(a, b) {
	a + b;
	a < b;
	a == b;
	return 1;
}
function bigint(a) {
	a + 1n;
	return 2;
}
console.log(unread(1, 2), bigint(1n));
// Its values collapse into the `return`, which then pairs with the `if`.
function wheel(e) {
	var x = e.x;
	var y = e.y;
	if (x == null || y == null) return 0;
	var delta = y !== 0 ? Math.abs(y) : Math.abs(x);
	var sign = y > 0 ? -1 : 1;
	return 3 * delta * sign;
}
console.log(wheel({ x: 1, y: 0 }), wheel({ x: 1, y: 2 }), wheel({ y: 1 }));
