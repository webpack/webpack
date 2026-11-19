"use strict";
// The program's one call, after its directive, prints its statements where
// what it is passed nothing reads and the `return` before them never runs.
!function (unused, other) {
	if (unused) return;
	let value = 1;
	function read() {
		return value;
	}
	const shown = String(read() + Math.floor(1.5));
	console.log(shown, shown);
}();
