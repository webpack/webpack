function step(value) {
	console.log("step", value);
	return value;
}
function tests(x) {
	if (!(step(1), x)) console.log("not", x);
	if (-(step(2), x)) console.log("minus", x);
	while (!(step(3), x)) x = 1;
	if ((step(4), x)) {
	} else console.log("else", x);
}
function exits(x) {
	if (x > 1) return -(step(5), x);
	return !(step(6), x);
}
function guards(x) {
	if ((step(7), x)) return;
	console.log("guarded", x);
}
function keeps(x, y) {
	if (!(step(8), x + y)) console.log("sum", x);
	if (!(step(9), !(x || y))) console.log("both", x);
	if (y) return;
	if (-(step(10), x)) console.log("joined", x);
}
function branches(c, x) {
	if (c) {
		if (-(step(11), x)) console.log("then", x);
		else console.log("else", x);
	} else console.log("other", x);
	if (c) return 1;
	return -(step(12), x);
}
function anded(t, a, b) {
	if (t) return;
	if (!(a == 1 && b == 2)) console.log("anded", a, b);
}
function either(t, a, b) {
	if (t) return;
	if (!(a == 1 || b == 2)) console.log("either", a, b);
}
function lone(x) {
	if ((step(13), x + 1)) {
	} else console.log("lone", x);
	while (-(step(14), x)) x = 0;
	return -(step(15), x);
}
function negates(x) {
	return !(step(16), !x);
}
function thrower(x) {
	throw -(step(17), x);
}
for (const x of [0, 1, 2]) {
	tests(x);
	console.log(exits(x));
	guards(x);
	keeps(x, x - 1);
	console.log(branches(x === 1, x));
	anded(x === 2, x, 2);
	either(x === 2, x, 2);
	console.log(lone(x), negates(x));
	try {
		thrower(x);
	} catch (error) {
		console.log("caught", error);
	}
}
