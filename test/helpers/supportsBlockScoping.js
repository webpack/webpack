module.exports = function supportsBlockScoping() {
	try {
		var f = eval(
			"(function f() { const x = 1; if (true) { const x = 2; } return x; })"
		);
		return f() === 1;
	} catch (e) {
		return false;
	}
};
