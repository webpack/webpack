function x() {
	console.log("x");
}
function y() {
	console.log("y");
}
function nested(a, b, c) {
	if (a) {
		if (b) {
			x();
		} else if (c) {
			x();
		} else {
			y();
		}
	} else {
		y();
	}
}
nested(1, 0, 1);
nested(0, 1, 1);
if (nested.length) {
	x();
} else if (nested) {
	x();
} else {
	y();
}
