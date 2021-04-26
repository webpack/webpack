module.exports = function supportsES6() {
	try {
		eval("class A { #field = 1 }");
		return true;
	} catch (e) {
		return false;
	}
};
