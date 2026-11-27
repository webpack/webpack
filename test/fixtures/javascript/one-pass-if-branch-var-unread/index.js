// A `var` an `if` holds as a branch, nothing reading it, goes as a list's
// does, its value still running.
var log = [];
function step(name) {
	log.push(name);
	return name;
}
function runtime(data) {
	var callback = data[2];
	if (callback) var result = callback("required");
}
function branches(test) {
	if (test) var first = step("then");
	else var second = step("else");
}
function constants(test) {
	if (test) var unused = 1;
	else step("else");
}
function nested(outer, inner) {
	if (outer)
		if (inner) var value = step("inner");
		else step("dangling");
}
// One read later, or beside another kept, keeps its name.
function read(test) {
	if (test) var value = step("read");
	return value;
}
function kept(test) {
	if (test) var gone = step("gone"),
		value = 2;
	return value;
}
runtime([0, 0, step]);
branches(1);
branches(0);
constants(0);
nested(1, 0);
console.log(read(1), read(0), kept(1), kept(0), log);
