function log(value) {
	console.log(value);
	return value;
}
function f(a, b) {
	debug("a", log(a), b.length);
	debug(1, 2);
	return debug(log(b));
}
f(1, [2, 3]);
