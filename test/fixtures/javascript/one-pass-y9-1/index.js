function kind(a, b, c) {
	return a ? "small" : b ? "small" : c ? "small" : "large";
}
function all(a, b, c) {
	return a ? (b ? (c ? "yes" : "no") : "no") : "no";
}
function mixed(a, b, c) {
	return a ? (b ? 1 : c ? 1 : 2) : 2;
}
function other(a, b, c) {
	return a ? 1 : b ? (c ? 1 : 2) : 2;
}
function x() {
	console.log("x");
}
function y() {
	console.log("y");
}
function run(a, b, c) {
	if (a) {
		x();
	} else if (b) {
		x();
	} else if (c) {
		x();
	} else {
		y();
	}
}
for (const a of [0, 1]) {
	for (const b of [0, 1]) {
		for (const c of [0, 1]) {
			console.log(kind(a, b, c), all(a, b, c), mixed(a, b, c), other(a, b, c));
			run(a, b, c);
		}
	}
}
