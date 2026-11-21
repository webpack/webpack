function make(source, flags) {
	try {
		return String(flags === undefined ? RegExp(source) : new RegExp(source, flags));
	} catch (error) {
		return error.name;
	}
}
function modifiers() {
	try {
		var a = RegExp("(?i:a)");
		var b = new RegExp("(?-i:a)b", "i");
		return [a.test("A"), b.test("aB")].join();
	} catch (error) {
		return error.name;
	}
}
console.log(modifiers());
console.log(make("a/b", "ig"), make("[/]x", "m"), make("\\d+"));
var sticky = RegExp("a", "y");
var unicode = RegExp("\\u{61}", "u");
console.log(sticky.sticky, unicode.test("a"));
