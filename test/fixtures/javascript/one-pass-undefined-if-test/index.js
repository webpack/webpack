// An `if` testing a local nothing sets runs its `else`, its other branch going.
function unset(y) {
	var x;
	if (x) {
		console.log("never");
	} else {
		console.log("else", y);
	}
}
unset(1);
unset(2);
function declared(y) {
	var x;
	if (x) {
		var kept = 1;
		console.log("never", kept);
	} else {
		console.log("else", y);
	}
}
declared(1);
declared(2);
function unpassed(a) {
	if (a) console.log("a");
	else {
		var b = 2;
		console.log("no a", b);
	}
}
unpassed();
unpassed();
function passed(a) {
	if (a) {
		var c = 3;
		console.log("a", c);
	} else console.log("no a");
}
passed(1);
passed(0);
