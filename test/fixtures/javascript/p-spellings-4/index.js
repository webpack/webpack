var a = 5,
	n = 0;
var v = (a & 8) !== 0,
	w = 0 != (n & 1),
	q = n ? (a & 1) != 0 : (a & 2) != 0;
function f(m) {
	return (m.flags & 4) !== 0;
}
console.log((a & 1) != 0, (a >> 1) != 0, v, w, q, ((a & 4) != 0) + 1, (a & 1) != 0 ? 1 : 2);
console.log(f({ flags: 4 }), f({ flags: 1 }));
