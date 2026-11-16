function a(x) {
	if (x) {
		console.log("a1");
	} else if (false) {
		console.log("a2");
	} else {
		console.log("a3");
	}
}
function b(x) {
	if (x) console.log("b1");
	else if (1) console.log("b2"), console.log("b3");
	else console.log("b4");
}
function c(x, y) {
	if (x) console.log("c1");
	else if (0) console.log("c2");
	else if (y) console.log("c3");
	else console.log("c4");
	return 1;
}
function d(x) {
	if (x) console.log("d1");
	else if (0) console.log("d2");
}
function e(x) {
	if (x) console.log("e1");
	else if (1) {
		var q = 2;
		console.log("e" + q);
	}
}
function f(x) {
	if (x) console.log("f1");
	else if (0) {
		var r = 3;
	} else console.log("f" + r);
}
a(0); a(1); b(0); b(1); c(0, 0); c(0, 1); c(1, 0);
d(0); d(1); e(0); e(1); f(0); f(1);
// A block the known test picks keeps its braces, so the `if` stays.
function pick(value, found, text) {
	if (typeof value === "object") {
		if (value.type) {
			found = value;
		} else {
			if ("development" !== "production") {
				console.log("unsupported");
			}
		}
	} else text = value;
	return [found, text];
}
console.log(pick({ type: 1 }), pick({}), pick(2));
