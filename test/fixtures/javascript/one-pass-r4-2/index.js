function or(t, e) {
	if (t === 0) return true;
	return e.length;
}
function and(t, e) {
	if (t > 1) return e.length;
	return false;
}
function orElse(t, e) {
	if (t === 0) return true;
	else return e.length;
}
function andElse(t, e) {
	if (t > 1) return e.length;
	else return false;
}
function wrapped(a, b, e) {
	if (a ? b < 0 : b > 9) return true;
	return e.length;
}
function setting(a, b, e) {
	if ((a = b ? b < 0 : b > 9)) return true;
	return e.length;
}
function value(t, e) {
	if (t) return true;
	return e.length;
}
for (const t of [0, 1, 2, -1, 10]) {
	console.log(or(t, "ab"), and(t, "ab"), orElse(t, "ab"), andElse(t, "ab"));
	console.log(wrapped(t, t, "ab"), setting(t, t, "ab"), value(t, "ab"));
}
