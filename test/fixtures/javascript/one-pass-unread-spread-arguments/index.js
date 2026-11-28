// A function's own `arguments` spread in an array nobody reads reads
// nothing where it is the one read: what else the array runs is left.
function spread() {
	[...arguments];
	return "spread";
}
function after() {
	[...arguments, run("after")];
	return "after";
}
// Read elsewhere, its iterator may be replaced, and one the body declares
// is no arguments object.
function replaced() {
	arguments[Symbol.iterator] = function () {
		throw new Error("replaced");
	};
	[...arguments];
	return "replaced";
}
function declared() {
	var arguments = { length: 1, 0: "own" };
	[...Array.from(arguments)];
	return [...arguments];
}
function run(label) {
	console.log(label);
	return label;
}
console.log(spread(1, 2), after(3));
for (const test of [replaced, declared]) {
	try {
		console.log(test(4));
	} catch (error) {
		console.log(error.name, error.message);
	}
}
