function log(value) {
	console.log(value);
}
function guards(a, b, c) {
	if (a == 1) return;
	if (!b) return;
	if (c !== a) return;
	log("guards");
}
function folds(a, b) {
	if (false || !a) return;
	if (b === 2) return;
	log("folds");
}
function keepsName(a, b) {
	if (a) return;
	if (!b) return;
	log("keepsName");
}
function keepsCompare(a, b) {
	if (!a) return;
	if (b < 2) return;
	log("keepsCompare");
}
function keepsIf(a, b) {
	if (!a) return;
	if (!b) return;
	if (a > b) log("keepsIf");
}
function keepsSeveral(a, b) {
	if (!a) return;
	if (!b) return;
	log("keepsSeveral");
	log(a + b);
}
function tests(a, b) {
	if (!a) return;
	if (!b) return;
}
function loops(list) {
	for (var i = 0; i < list.length; i++) {
		if (!list[i]) continue;
		if (list[i] != 3) continue;
		log(i);
	}
}
for (var a = 0; a < 4; a++) {
	for (var b = 0; b < 4; b++) {
		guards(a, b, a);
		folds(a, b);
		keepsName(a, b);
		keepsCompare(a, b);
		keepsIf(a, b);
		keepsSeveral(a, b);
		tests(a, b);
	}
}
loops([0, 3, 1, 3]);
