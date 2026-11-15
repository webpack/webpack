// An inlined call to an unread pure value prints nothing, so a loop body
// that held it becomes the empty statement.
function f(a) {
	function k() {
		return a;
	}
	for (;;) k();
	g();
}
