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
	}
	if (t("d", i)) x();
	else if (t("e", i > 1)) y();
}
var a, b;
if ((a = i > 3)) x();
else if (t("f", 0) ? a : 1) x();
function nested(z, p, q) {
	if (z) {
		if (p) log.push("p");
		else if (q) log.push("p");
	} else log.push("z");
}
nested(1, 0, 1);
nested(0, 1, 1);
if (t("g", a) || b) x();
else if (t("h", 1) && !b) x();
console.log(log.join(), a, b);
