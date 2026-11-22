var log = [];
function note(value) {
	log.push(value);
	return value;
}
function pick(flag, other) {
	if (note(flag)) note("yes");
	else if (note(other)) for (;;) break;
}
function pickBlock(flag, other) {
	if (note(flag)) note("yes");
	else if ((note(other), note("again"))) {
	}
}
function nested(flag, other) {
	if (note(flag)) {
		if (note(other));
	} else note("no");
}
pick(0, 1);
pick(1, 0);
pickBlock(0, 2);
nested(1, 3);
nested(0, 4);
console.log(log.join());
