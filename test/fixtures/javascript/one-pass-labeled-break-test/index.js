var n = 0;
function more() {
	return n++ < 6;
}
function third() {
	return n % 3 === 0;
}
out: while (more()) {
	if (third()) break out;
	console.log("a", n);
}
n = 0;
kept: while (more()) {
	if (third()) console.log("b", n);
	else break kept;
	console.log("c", n);
}
n = 0;
counted: for (var i = 0; i < 9; i++) {
	if (i > 3) break counted;
	else console.log("d", i);
	console.log("e");
}
n = 0;
outer: for (;;) {
	for (;;) {
		if (n++ > 2) break outer;
		console.log("f", n);
	}
}
n = 0;
plain: while (more()) {
	if (third()) console.log("g", n);
	else break;
	console.log("h", n);
}
