function log(name) {
	console.log(name);
}
function first() {
	switch (2) {
		case (log("a"), 1):
			log("one");
			break;
		case 2:
			log("two");
			break;
	}
}
function fallback() {
	switch (3) {
		default:
			log("default");
		case (log("b"), 1):
			log("after");
	}
}
function none() {
	switch (4) {
		case (log("c"), 1):
			log("x");
			break;
		case (log("d"), 2):
			log("y");
			break;
	}
}
first();
fallback();
none();
