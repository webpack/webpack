// `(y, void z) ?? 1` is `(y, z, 1)`: the `void` the left ends with goes.
var counter = { value: 0 };
function run(label) {
	console.log(label);
	return label;
}
function pick(value) {
	return (run("first"), void value) ?? run("fallback");
}
function member() {
	return (run("member"), void counter.value) ?? 2;
}
function zero() {
	return (run("zero"), void 0) ?? 3;
}
// A call or a parenthesized value after `void` keeps it.
function called() {
	return (run("called"), void run("inner")) ?? 4;
}
console.log(pick(1), member(), zero(), called());
