// A loop whose test reads a constant or a `var` nothing sets, known once
// the walk is done, never runs, as an `if` reading one does.
function constant() {
	var running = 0;
	while (running) console.log("never");
	console.log("constant");
}
constant();
function unset() {
	var running;
	for (; running; ) console.log("never");
	console.log("unset");
}
unset();
function labeled() {
	var running;
	outer: while (running) {
		console.log("never");
		break outer;
	}
	console.log("labeled");
}
labeled();
// One whose test is set, or whose body declares a `var`, stays.
function set() {
	var count = 2;
	count = 0;
	while (count) count--;
	var running = 1;
	while (running) running = 0;
	console.log("set", running);
}
set();
function hoisting() {
	var running;
	while (running) var seen = 1;
	console.log("hoisting", seen);
}
hoisting();
