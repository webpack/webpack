var calls = 0;
function count() {
	calls++;
	return calls;
}
function run() {
	var unset;
	return unset, count();
}
function fail() {
	throw (1, new Error("thrown " + count()));
}
console.log(run(), run());
try {
	fail();
} catch (error) {
	console.log(error.message, fail === fail);
}
function pick(flag, other) {
	if (flag) return other, 1;
	return other + 2;
}
function call(flag, other) {
	if (flag) return other, count();
	return other + 2;
}
console.log(pick(1, 0), pick(0, 0), call(1, 0), call(0, 0));
