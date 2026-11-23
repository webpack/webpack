var log = [];
function t(v) {
	log.push(v);
	return v;
}
var a = 0,
	b = 1;
switch (0) {
	default:
		b = 2;
	case a:
		a = 3;
	case 0:
}
console.log(a, b);
switch (t(1)) {
	default:
	case t(2):
}
switch (2) {
	case t(6) || 2:
		log.push("or");
}
switch (3) {
	case (t(7), 3):
		log.push("sequence");
}
console.log(log.join());
