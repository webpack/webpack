function afterReturn() {
	var a = 1,
		b = 0;
	!(function () {
		b++;
		return;
		a = 2;
	})();
	console.log(a);
}
function deadAnd() {
	var a;
	void 0 && (a = 1);
	console.log(a);
}
function deadBranch() {
	var a = "kept";
	if (0) a = "never";
	else console.log(a);
	return 1 ? a : (a = "never");
}
function keptTarget() {
	var a = 3;
	if (0) {
		/* @__KEEP__ */ a++;
	}
	return a;
}
function liveWrite() {
	var a = 1;
	if (Math.random() < 2) a = 2;
	return a;
}
afterReturn();
deadAnd();
console.log(deadBranch(), keptTarget(), liveWrite());
