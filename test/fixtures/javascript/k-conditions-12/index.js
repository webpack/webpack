while (x) {
	if (a) continue;
	if (b) continue;
}
for (;;) {
	if (a) break;
	if (b) break;
}
function f() {
	if (x) {
		if (a) return;
		if (b) return;
	} else z();
	while (x) {
		if (y) {
			throw x;
		}
		throw x;
	}
}
