// A function only returning a constant: each call passing nothing is it.
console.log(early(), early());
function early() {
	return 1;
}
function twice(unused) {
	return true;
}
console.log(twice(), twice(), early());
// A call passing something, or a value longer than the call, stays.
function long() {
	return "a long string";
}
function nothing() {
	return null;
}
console.log(long(), long(), twice(early()), nothing(), nothing());
// A key no constant keeps its object; a call unread as a body prints nothing.
console.log(Object.keys({ a: 1, [long()]: 2 }).join());
for (var index = 0; index < 2; index++) early();
// A read that goes counts once: the call passing something keeps it.
function nested() {
	function inner() {
		return 1;
	}
	inner();
	return inner(early());
}
console.log(nested());
// A default runs code, and a block sets its function only once it runs.
function defaulted(value = console.log("default")) {
	return 2;
}
console.log(defaulted(), defaulted());
try {
	console.log(blocked());
} catch (error) {
	console.log(error instanceof TypeError);
}
{
	function blocked() {
		return 3;
	}
}
console.log(blocked(), blocked());
// What another write or kind of function returns stays a call.
function written() {
	return 4;
}
written = function () {
	return 5;
};
async function later() {
	return 6;
}
function* generated() {
	return 7;
}
console.log(written(), written(), typeof later(), generated().next().value);
