var seen = [];
function empty() {}
function note(value) {
	seen.push(value);
	return value;
}
switch (1) {
	case 0:
		var x = 1;
	case empty():
	default:
	case empty(2):
	case 1:
		console.log("declared", x);
}
switch (2) {
	case 0:
		var y = 1;
	case (function () {})():
		console.log("expression");
		break;
	case 2:
		console.log("matched", y);
}
switch (3) {
	case empty(note("runs")):
		console.log("not reached");
		break;
	case 3:
		console.log("third");
}
console.log(seen.join());
