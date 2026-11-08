function f(x, o) {
	switch (x) {
		case 1:
			o.a = 1;
			console.log(o.a);
			break;
		case 2:
			var p = o.b;
			var q = o.c;
			console.log(p, q);
			let r = p + 1;
			let s = q + 1;
			console.log(r, s);
		default:
			console.log("d");
			if (x) console.log("x");
			console.log("e");
	}
}
f(1, {});
f(2, { b: 1, c: 2 });
f(0, {});
