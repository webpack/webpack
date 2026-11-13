function chains(a, b, c) {
	if (!(a == 1 || b == 2 || c == 3)) console.log("none", a, b, c);
	if (!(a === 1 && b === 2 && c === 3)) console.log("not all", a, b, c);
	var v = !(a === 1 || b === 2 || !c);
	var w = !(a == 1 || b == 2 || c);
	var u = !(a == 1 || b < 2 || c == 3);
	var t = a && !(a == 1 || b == 2 || c == 3);
	var s = a || !(a == 1 && b == 2 && c == 3);
	var r = a && !(a == 1 && b == 2 && c == 3);
	var q = c ?? !(a == 1 || b == 2 || c == 3);
	var p = 1 + !(a == 1 || b == 2 || c == 3);
	var o = c ? !(a == 1 || b == 2 || c == 3) : 0;
	var n = !(a == 1 || b == 2 || c == 3) ? 1 : 2;
	if (!(a < 1 || b < 2 || !c)) console.log("unlinked", a, b, c);
	console.log(v, w, u, t, s, r, q, p, o, n);
}
for (const a of [0, 1]) for (const b of [1, 2]) for (const c of [0, 3]) chains(a, b, c);
