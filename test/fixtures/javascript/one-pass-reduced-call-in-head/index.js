var log = [];
function first() {
	log.push("first");
	return log.length;
}
function second() {
	log.push("second");
	return log.length > 1;
}
function tested() {
	switch (first()) {
		case 2:
			log.push("two");
			break;
		case 3:
			log.push("three");
	}
	log.push("switch");
}
function chosen(x) {
	if (second()) log.push("if", x);
}
tested();
chosen(1);
console.log(log.join());
