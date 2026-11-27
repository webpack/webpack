// A `while` whose test is known false runs that test alone, declaring what its body declares.
var calls = 0;
function count() {
	calls++;
	return 1;
}
while (count() && 0) count();
function declares() {
	while (count() && 0) {
		var hoisted = 1;
		count();
	}
	return hoisted;
}
function labeled() {
	outer: while (count() && 0) {
		count();
		break outer;
	}
	return calls;
}
function read(probe) {
	var before = 1;
	while (probe.x && 0) {
		var inner;
	}
	var after = 2;
	return [before, inner, after];
}
function branch(c) {
	if (c) while (count() && 0) count();
	else count();
	return calls;
}
console.log(calls, declares(), labeled(), read({ get x() { calls += 10; return 1; } }), branch(1), branch(0), calls);
