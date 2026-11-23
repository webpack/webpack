// A `do` testing false runs its body once where it is, as where no `break` or
// `continue` prints in it: a `switch` that goes takes its jumps along, and
// both join the expressions around them.
function seen(value) {
	console.log("seen", value);
	return value;
}
function jumps(a) {
	do {
		switch (seen(a)) {
			case 1:
				continue;
		}
	} while (false);
	console.log("after", a);
}
jumps(1);
jumps(2);
function nested(a) {
	for (var i = 0; i < 2; i++) {
		console.log("start", i);
		do {
			switch (seen(a)) {
				case 1:
					break;
			}
		} while (0);
		console.log("loop", i);
	}
}
nested(1);
nested(2);
