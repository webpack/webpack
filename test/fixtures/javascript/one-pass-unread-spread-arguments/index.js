// A function's own `arguments` spread in an array nobody reads reads
// nothing: what else the array runs is left.
function spread() {
	[...arguments];
	[...arguments, run("after")];
	return arguments.length;
}
// One the body declares, or one read, stays.
function declared() {
	var arguments = { length: 1, 0: "own" };
	[...Array.from(arguments)];
	return [...arguments];
}
function run(label) {
	console.log(label);
	return label;
}
console.log(spread(1, 2));
try {
	console.log(declared());
} catch (error) {
	console.log(error.name);
}
