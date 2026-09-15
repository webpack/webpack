// `var` so the parser cannot fold the branch away and drop the dependency —
// the module must be built, only never executed.
var never = false;

it("should build the failing module without crashing", () => {
	if (never) {
		require("../_images/file.png");
	}
});

it("should keep the stack that says where the value came from", () => {
	let message = "";
	try {
		require("../_images/file.png");
	} catch (error) {
		message = error.message;
	}

	// nothing the project owns is on this stack, so what names the site is the
	// frame webpack owns — relative, and without the position that moves
	expect(message).toMatch(/[\s(]\.\.\/[^\s)]*NormalModule\.js\)?$/m);
	expect(message).not.toMatch(/NormalModule\.js:\d/);
	expect(message).not.toMatch(/[\s(](?:\/|[A-Za-z]:[\\/])/);
});
