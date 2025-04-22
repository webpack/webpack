module.exports = function supportsSpread() {
	try {
		const x = { a: true };
		let y;
		eval("y = { ...x }");
		return y !== x && y.a;
	} catch (_err) {
		return false;
	}
};
