var log = [];
function run(flag) {
	log.push("start");
	if (1)
		switch (1) {
			case 1:
				log.push("one");
		}
	log.push("middle");
	switch (2) {
		case 1:
			log.push("skipped");
			break;
		case 2:
			log.push("two");
			log.push("three");
	}
	log.push("end", flag);
}
run(1);
run(0);
console.log(log.join());
