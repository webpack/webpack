var log = [];
function first() {
	log.push("first");
}
function plain(x) {
	first();
	if (x)
		switch (1) {
			case 2:
				x();
		}
	log.push("plain", x);
}
function labeled(x) {
	first();
	if (x)
		A: switch (1) {
			case 2:
				x();
		}
	log.push("labeled", x);
}
function broken() {
	first();
	if (1) while (1) break;
	log.push("broken");
}
function constant() {
	first();
	if (1) D: if (0) first();
	log.push("constant");
}
plain(1);
labeled(1);
broken();
constant();
console.log(log.join());
