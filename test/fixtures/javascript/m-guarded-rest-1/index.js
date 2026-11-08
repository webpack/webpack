function a() {
	if (c) return;
	if (void g()) {
		h();
	}
}
function b() {
	if (c) return;
	if (void function () { c; }()) {
		h();
	}
}
