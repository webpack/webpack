// A `switch` of one case testing an update prints as an `if`, which
// evaluates the update, then the test, as the `switch` does.
var a = 1,
	b = 2;
switch (b++) {
	case b:
		var c = a;
		var a;
		break;
}
console.log(a, b, c);
function down(n) {
	switch (--n) {
		case 1:
			return "one";
	}
	return "other";
}
console.log(down(2), down(5));
