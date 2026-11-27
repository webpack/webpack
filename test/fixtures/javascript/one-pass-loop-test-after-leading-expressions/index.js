// Expressions opening a loop's body before its `if(x)break` join its test as a sequence.
var log = [];
function step(name, value) {
	log.push(name);
	return value;
}
function tested() {
	var n = 0;
	for (; step("test", n < 3); ) {
		step("a");
		step("b");
		if (step("exit", n === 2)) break;
		n++;
	}
	return n;
}
function forever() {
	var n = 0;
	for (;;) {
		n++;
		if (n > 2) break;
		step("body");
	}
	return n;
}
function kept() {
	var n = 0;
	while (n < 5) {
		n++;
		if (step("keep", n < 4)) step("then");
		else break;
		step("rest");
	}
	return n;
}
function scoped() {
	var n = 0;
	for (; n < 3; ) {
		let m = n++;
		if (m > 1) break;
		step("scoped" + m);
	}
	return n;
}
function labeled() {
	var n = 0;
	outer: for (; n < 9; ) {
		n++;
		if (n > 1) break outer;
		step("labeled");
	}
	return n;
}
function emptied() {
	var n = 0;
	for (; n < 9; n++) {
		step("emptied");
		if (n > 1) break;
	}
	return n;
}
console.log(tested(), forever(), kept(), scoped(), labeled(), emptied(), log);
