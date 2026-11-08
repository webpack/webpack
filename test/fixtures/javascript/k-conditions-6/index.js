function f(y) {
	if (y) return;
	var y;
}
function g(x, y) {
	while (x) {
		if (y) continue;
		var y = x();
	}
}
function h(y) {
	if (y) return;
	let z = y();
	use(z);
}
