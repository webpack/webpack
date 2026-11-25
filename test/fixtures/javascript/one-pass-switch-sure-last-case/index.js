var log = [];
function bar() {
	log.push("bar");
	return 0;
}
function one() {
	log.push("one");
	return 1;
}
var x = 5;
switch (1) {
	case 0:
		var y = 1;
	case bar():
	default:
	case bar():
	case 1:
		console.log(x, y, log.join());
}
switch (1) {
	case one():
	case bar():
	case 1:
		console.log("matched", log.join());
		break;
}
switch (one()) {
	case bar():
	case 1:
		console.log("unknown", log.join());
}
