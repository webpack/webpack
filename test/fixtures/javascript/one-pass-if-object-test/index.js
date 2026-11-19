// An `if` testing an object, array, function or regular expression made in place takes its first branch.
function regexp(a) {
	if (/foo/) console.log("regexp", a);
	else console.log("never");
}
function array(a) {
	if ([]) return "array" + a;
	return a;
}
function object(a) {
	if (!{}) return a;
	return "object" + a;
}
function fn(a) {
	if (function () {}) {
		console.log("function", a);
	}
}
regexp(1);
regexp(2);
fn(3);
fn(4);
console.log(array(5), object(6), array(7), object(8));
