var x = 5.7,
	y = -3.2,
	o = {
		valueOf() {
			console.log("v");
			return 9.9;
		}
	},
	b = 2;
console.log(x << 0, y >> 0, (x + y) << 0, (x << 0) | b, b | (x << 0), (x << 0) + 1, -(x << 0), o << 0, x >>> 0, 1 << 0);
var z = x << 0,
	w = { k: y >> 0 },
	t = `${x << 0}`;
console.log(z, w.k, t, (x << 0) << 1);
