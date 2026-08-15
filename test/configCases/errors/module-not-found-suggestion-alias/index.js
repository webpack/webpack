var never = false;

it("should follow aliases to the directory the resolver looked in", function () {
	if (never) {
		require("@/button.js");
		require("@/subdir/nested.js");
		require("@/Componet.js");
		require("~/button.js");
		// 'onlyModule' stops the alias from matching a path below its name
		require("only/button.js");
		// An ignored request resolves to an empty module, so nothing is wrong
		require("ignored/whatever.js");
	}
});
