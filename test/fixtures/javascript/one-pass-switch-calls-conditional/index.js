// A `switch` of a case and a `default` each running one expression prints as
// `?:`, a call on each side where a test runs code before the callee is read.
function id(value) {
	return value;
}
function pick(x) {
	switch (x) {
		case id(1):
			console.log("one");
			break;
		default:
			console.log(x);
	}
}
pick(1);
pick(2);
function constant() {
	switch (1) {
		case id(2):
			console.log("two");
			break;
		case 1:
			console.log("one");
	}
}
constant();
constant();
var log = console.log;
function swapped(x) {
	switch (x) {
		case id((log = id)(3)):
			log("three");
			break;
		default:
			log("not three");
	}
	log = console.log;
}
swapped(3);
swapped(4);
function listed(x) {
	switch (x) {
		case id(5):
			console.log("five", x);
			break;
		default:
			console.log("other", [x, 5]);
	}
}
listed(5);
listed(6);
function sequenced(x) {
	switch (x) {
		case id(7):
			console.log("seven"), console.log(x);
			break;
		default:
			console.log("not seven");
	}
}
sequenced(7);
sequenced(8);
var seen;
function assigned(x) {
	switch (x) {
		case id(9):
			seen = (console.log("nine"), 9);
			break;
		default:
			seen = (console.log("not nine"), 0);
	}
}
assigned(9);
console.log(seen);
assigned(10);
console.log(seen);
function trailing(x) {
	switch (x) {
		case id(11):
			console.log("eleven");
			break;
		default:
			console.log("not eleven"), console.log(x);
	}
}
trailing(11);
trailing(12);
