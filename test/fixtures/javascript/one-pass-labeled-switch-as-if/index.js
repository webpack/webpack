var log = [];
function next() {
	log.push("next");
	return log.length;
}
function single() {
	A: switch (next()) {
		case 1:
			log.push("one");
	}
	log.push("single");
}
function jumped() {
	C: switch (next()) {
		case 7:
			log.push("seven");
			break C;
		default:
			log.push("default");
	}
}
single();
jumped();
console.log(log.join());
