// A `switch` whose cases all run its last case's statements runs its tests, then those.
var log = [];
var first = 1,
	second = 2;
function run(value) {
	log.push(value);
}
function names(value) {
	switch (value) {
		case first:
			run("names");
			break;
		case second:
			run("names");
			break;
		default:
			run("names");
	}
}
function called(value) {
	switch (value) {
		case run("test"):
			run("called");
			break;
		case second:
			run("called");
			break;
		default:
			run("called");
	}
}
function calls(value) {
	switch (value) {
		case run("first"):
			run("calls");
			break;
		case run("second"):
			run("calls");
			break;
		default:
			run("calls");
	}
}
function labeled(value) {
	out: switch (value) {
		case first:
			run("labeled");
			break out;
		default:
			run("labeled");
	}
}
function branch(value, c) {
	if (c)
		switch (value) {
			case first:
				run("branch");
				break;
			default:
				run("branch");
		}
	else run("other");
}
// A later test reading a global the match leaves unread keeps the `switch`.
function unbound(value) {
	switch (value) {
		case run("matched"):
			run("unbound");
			break;
		case missing:
			run("unbound");
			break;
		default:
			run("unbound");
	}
}
unbound(void 0);
names(1);
called(void 0);
calls(void 0);
labeled(2);
branch(1, true);
branch(1, false);
console.log(log);
