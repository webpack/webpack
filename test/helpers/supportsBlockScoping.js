module.exports = function supportsBlockScoping() {
	try {
		const f = eval(
			"(function f() { const x = 1; if (true) { const x = 2; } return x; })"
		);
		return f() === 1;
	} catch (_err) {
		return false;
	}
};
