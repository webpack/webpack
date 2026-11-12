// A shift by zero prints as `|0` only where its place binds looser than `|`
var g;
// or is the left of one.
function run(x, c, d) {
	var y = x << 0, z;
	z = x >> 0;
	console.log(y, z, (x << 0) | 1, 1 | (x << 0), (x << 0) + 1);
	console.log(c ? x << 0 : d, c && x >> 0, (d, x << 0), [x << 0], `${x >> 0}`);
	console.log({ p: x << 0 }, new Number(x << 0));
	if (c) return x << 0;
	if (d) throw x >> 0;
	g = x << 0;
	console.log(g, (x << 0) * 2, x << 0, -(x >> 0));
}
console.log(run(-3.7, 0, 0), run(5.5, 1, 0));
try { run(2.2, 0, 1); } catch (e) { console.log(e); }
