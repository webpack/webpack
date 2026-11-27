// A known `switch` whose matched case is a block ending in `break` prints the block without it.
var log = [];
function step(name, value) {
	log.push(name);
	return value;
}
function pick(type) {
	switch (type) {
		case "async": {
			const id = step("start", 3);
			step("id" + id);
			break;
		}
		case "sync":
			step("never");
	}
	step("after");
}
pick("async");
function returned() {
	switch ("a") {
		case "a": {
			step("returned");
			return 1;
			break;
		}
	}
	step("unreached");
}
function looped() {
	var n = 0;
	switch ("a") {
		case "a": {
			for (;;) {
				if (++n > 2) break;
				step("loop" + n);
			}
			step("text break");
			break;
		}
	}
	return n;
}
function labeled() {
	switch ("a") {
		case "a": {
			inner: {
				step("labeled");
				break inner;
			}
			break;
		}
	}
	step("after labeled");
}
// A `break` before the last statement still keeps the `switch`.
function early(x) {
	switch ("a") {
		case "a": {
			if (x) break;
			step("early");
			break;
		}
	}
}
console.log(returned(), looped(), labeled(), early(0), early(1), log);
