module.exports = function supportsClassStaticBLock() {
	try {
		eval("(function f({x, y}) { class Foo { static {} } })");
		return true;
	} catch (_err) {
		return false;
	}
};
