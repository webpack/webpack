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
