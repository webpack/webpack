function a(skip) {
	if (skip) return;
	if (log() || 1) {
		(() => {
			work();
		})();
		done();
	}
}
function b(skip) {
	if (skip) g();
	else if (log() || 1) {
		(() => {
			work();
		})();
		done();
	}
}
