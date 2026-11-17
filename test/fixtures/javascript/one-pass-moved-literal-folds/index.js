// A literal moved to its one read folds what reads it.
var kind = "test";
if (kind === "test") {
	var meat = "beef";
	if (meat === "pork") console.log("unreachable");
	else console.log("reached");
}
function joined() {
	var part = "a";
	return part + "b";
}
console.log(joined());
// A value that runs something stays.
function called(read) {
	var value = read();
	return value === "pork";
}
console.log(called(function () {
	return "pork";
}));
