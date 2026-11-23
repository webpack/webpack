var log = [];
function t(name, value) {
	log.push(name);
	return value;
}
function x() {
	log.push("x");
}
function y() {
	log.push("y");
}
for (var i = 0; i < 4; i++) {
	if (t("a", i == 1)) {
		x();
	} else if (t("b", i == 2)) {
		x();
	} else if (t("c", i == 3)) {
		x();
	} else {
		x();
	}
	if (t("z", i)) {
		if (t("f", i == 1)) x();
		else if (t("g", 0)) x();
		else x();
	} else y();
}
console.log(log.join());
