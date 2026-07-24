// every top-level statement shape the side-effects statement scan classifies;
// heads stay pure so the scan reaches the flagging `debugger` last
for (; false; ) {
	// never runs, and no nested statement flags the scan
}
// expression heads only: declaration inits are never `isPure`
for (0; false; 0) {
	// never runs
}
switch (1) {
	default:
}
outer: {
}

while (false) {
	// pure while head
}
do {
	// pure do-while head
} while (false);
const answer = 42;
class Shape {}
function shapeOf() {
	return Shape;
}
function pretendAsmSoa(x) {
	"use asm";
	var t = x ? 1 : 2;
	var l = x && 1;
	if (x) {
		t = 2;
	}
	return (t + l) | 0;
}
switch (Math.random()) {
	// impure discriminant: flags the module as the final scanned statement
	default:
}
export { answer, shapeOf, pretendAsmSoa };
