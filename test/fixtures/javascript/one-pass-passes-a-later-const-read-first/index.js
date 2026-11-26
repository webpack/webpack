// A `const` declared later passes into a body that first calls with it.
function triple(x) {
	return [x, 2 * x, 3 * x];
}
function wrapped() {
	for (const item of pass(value)) console.log(item);
	function pass(v) {
		return triple(v);
	}
}
try {
	wrapped();
} catch (error) {
	console.log(error.name);
}
const value = 10;
wrapped();
// Kept: something runs before the parameter is read.
function logged() {
	return (function (v) {
		console.log("first");
		return triple(v);
	})(later);
}
try {
	logged();
} catch (error) {
	console.log(error.name);
}
const later = 2;
console.log(logged().join());
function arrow() {
	return ((v) => triple(v))(last);
}
const last = 3;
console.log(arrow().join());
function classes() {
	return (function (v) {
		return triple(v);
	})(Later);
}
class Later {}
console.log(classes().length);
