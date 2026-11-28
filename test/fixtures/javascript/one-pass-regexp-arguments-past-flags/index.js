// `RegExp` evaluates what it is passed past the flags, then ignores it: an
// expression nobody reads runs only that.
function run(label) {
	console.log(label);
	return label;
}
new RegExp("x", "g", run("extra"));
new RegExp("y", "i", 1, 2);
// A pattern that throws, or one read, stays.
try {
	new RegExp("(", "g", run("before throw"));
} catch (error) {
	console.log(error.name);
}
var kept = new RegExp("z", "g", run("kept"));
console.log(String(kept));
