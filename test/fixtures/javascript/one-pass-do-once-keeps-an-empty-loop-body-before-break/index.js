var log = [];
function run(a) {
	if (a) {
		do {
			for (var i = 0; i < 1; i++) {}
			break;
		} while (a);
	}
	log.push(i);
}
run(true);
run(false);
console.log(log.join());
