// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependencies — the modules must be built, only never executed.
var never = false;

it("should build every module whose loader output fails to parse", function () {
	if (never) {
		require("./single.tpl");
		require("./array.tpl");
		require("./string.tpl");
	}
});

it("should throw the parse error when the module is executed", function () {
	expect(function () {
		require("./single.tpl");
	}).toThrow(/File was processed with these loaders/);
});
