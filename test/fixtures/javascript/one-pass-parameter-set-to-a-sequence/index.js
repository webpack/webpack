// A parameter set to a sequence, then read once, prints the sequence in parentheses where its read needs them.
var log = [];
function run(value) {
	log.push(value);
	return value;
}
function returned(x) {
	x = (run(1), 2);
	return x;
}
function element(x) {
	x = (run(3), 4);
	return [x];
}
function argument(x) {
	x = (run(5), 6);
	return run(x, 7);
}
function member(x) {
	x = (run(8), "nine");
	return x.length;
}
function negated(x) {
	x = (run(10), 0);
	return !x;
}
function branch(x, c) {
	if (c) {
		x = (run(11), 12);
		return x;
	}
}
console.log(returned(), element(), argument(), member(), negated(), branch(0, 1), log);
