module.exports = function supportsImportAttributes() {
	try {
		var f = eval(
			"(function f() { return import('./pkg.json', { assert: { type: 'json' } }); })"
		);
		return f();
	} catch (e) {
		return false;
	}
};
