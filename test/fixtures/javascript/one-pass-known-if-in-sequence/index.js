var log = [];
function note(value) {
	log.push(value);
	return value;
}
function run() {
	note("a");
	if (1 !== 2) note("b");
	else note("never");
	note("c");
	if ("x" == "y") note("never");
	if (!0)
		(function () {
			if (log.length) note("d");
			for (var i = 0; i < 2; i++) note(i);
		})();
	return note("e");
}
run();
run();
note("f");
if (2 > 1) note("g");
for (;;) {
	note("h");
	if (1) note("i");
	break;
}
console.log(log.join());
