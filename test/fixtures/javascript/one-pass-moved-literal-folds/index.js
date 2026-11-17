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
// A `new` printing no argument keeps its parentheses before a member.
function Made() {
	this.x = 1;
}
new Made();
console.log(
	(function () {
		return new Made(0);
	})().x
);
// What runs before the value prints before it.
var flag = 0;
console.log(
	(function () {
		log();
		return true && (flag ? log(1, 2) : log());
	})()
);
function log(value) {
	return value;
}
// A value that runs something stays.
function called(read) {
	var value = read();
	return value === "pork";
}
console.log(called(function () {
	return "pork";
}));
