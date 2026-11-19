// A `switch` on a function, class, object or array written there tests as an `if`.
var seen = [];
function log(value) {
	seen.push(value);
	return value;
}
var b = log;
switch (function () { return 1; }) {
	case b:
		console.log("FAIL function");
}
switch ({}) {
	case log("object"):
		console.log("FAIL object");
}
switch ([]) {
	case log("array"):
		console.log("FAIL array");
		break;
}
switch (class {}) {
	case log("class"):
		for (; log("never"); ) {}
}
console.log(seen.join());
