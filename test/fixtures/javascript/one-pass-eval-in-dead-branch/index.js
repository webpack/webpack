// An `eval` a literal test never runs reads no name: what the scope
// declares goes or renames as anywhere.
function outer() {
	function inner() {
		if (false) eval("unused");
	}
	inner();
	var unused = 1;
	return "outer";
}
function looped(value) {
	while (0) eval("value");
	var doubled = value * 2;
	return doubled;
}
// One that may run pins the scope.
function live(flag) {
	var kept = "kept";
	if (flag) return eval("kept");
	return kept;
}
console.log(outer(), looped(2), live(true), live(false));
