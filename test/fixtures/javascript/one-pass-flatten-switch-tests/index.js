var log = [];
function f(v) {
	log.push(v);
	return v;
}
var c = "FAIL";
switch (0) {
	case ((c = "PASS"), 0):
}
console.log(c);
var a = 0,
	b = 1;
switch (true) {
	case (a, true):
	default:
		b = 2;
	case true:
}
console.log(a, b);
switch (3) {
	case (f(1), 1):
		f(2);
	default:
		f(3);
	case (f(4), 2):
		f(5);
}
switch (1) {
	case (f(6), 1):
		f(7);
	case null.x:
		f(8);
}
var y = 5;
try {
	switch (1) {
		case (f(9), y):
			break;
		case 1:
			break;
		default:
			let y;
	}
} catch (e) {
	f(e.name);
}
var o = {
	set s(v) {
		f("set" + v);
	}
};
switch (2) {
	case (o.s = 1):
		f(10);
	case (o.s = 2):
		f(11);
}
console.log(log.join(","));
