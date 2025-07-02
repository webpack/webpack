module.exports = function supportsSpread() {
	try {
		const x = { a: true };
		// eslint-disable-next-line no-unassigned-vars
		let y;
		eval("y = { ...x }");
		return y !== x && y.a;
	} catch (_err) {
		return false;
	}
};
