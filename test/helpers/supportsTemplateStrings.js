module.exports = function supportsTemplateStrings() {
	try {
		var f = eval("(function f() { return String.raw`a\\b`; })");
		return f() === "a\\b";
	} catch (e) {
		return false;
	}
};
