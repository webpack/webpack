// A call of a function a `let` or `const` nothing writes is set to drops the
// pure arguments trailing what its parameters read.
const first = (a, b) => a + "!";
const both = function (a, b) {
	return a + b;
};
const counted = function () {
	return arguments.length;
};
let local = (a) => a * 2;
function run(value) {
	return [first(value, 2, 3), both(value, "b", "c"), counted(1, 2), local(value, 9)];
}
console.log(run("x"));
console.log(run(1));
