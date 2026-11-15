// A call that folds to nothing, as a loop's body, prints the empty statement.
function f(a) {
	function k() {
		return a;
	}
	for (;;) k();
}
