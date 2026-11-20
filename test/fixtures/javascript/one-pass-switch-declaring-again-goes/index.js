// A `switch` testing what runs nothing, whose cases only declare again a
// `var` declared before, runs nothing and goes.
var a = 1,
	b = 2;
switch (a) {
	case a:
		var b;
		break;
	case b:
		break;
}
console.log(a, b);
function inner(x) {
	var y = x;
	log();
	switch (x) {
		case 1:
			var y;
	}
	return y;
}
function log() {
	console.log("log");
}
console.log(inner(1), inner(2));
