export var tally = 0;
if (tally === 0) {
	var tally = 1;
}
for (var tally of [2]) {
	// the loop head declares the binding once more
}
export var first = 1,
	second = 2;
export var mixed = 1;
var mixed = 4,
	unrelated = 3;

export function bumpVariables() {
	tally++;
	first = second + unrelated;
	mixed++;
}
