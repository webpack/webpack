function tick() {
	console.log("tick");
}
function run(name, fn) {
	try {
		fn();
	} catch (e) {
		console.log(name, e.name);
	}
}
// A write before the declaration throws.
run("write", function () {
	x = 1;
	tick();
	console.log(x, x);
	let x;
});
// A read before the declaration throws.
run("read", function () {
	tick();
	console.log(y, y);
	let y = 2;
	y = 3;
	console.log(y, y);
});
// An update before the declaration throws.
run("update", function () {
	z++;
	tick();
	console.log(z, z);
	let z = 0;
});
// A closure called before the declaration throws.
run("closure", function () {
	function g() {
		return w;
	}
	tick();
	console.log(g());
	let w = 1;
	w = 2;
	console.log(w, w);
});
// Its own initializer reads it in the dead zone.
run("init", function () {
	let v = (tick(), v);
	console.log(v, v);
});
// A `const` read before its declaration throws.
run("const", function () {
	tick();
	console.log(c, c);
	const c = "c";
	console.log(c, c);
});
// After the declaration, the reads fold.
run("after", function () {
	tick();
	let u;
	u = 1;
	tick();
	console.log(u, u);
	u = 2;
	console.log(u, u);
});
