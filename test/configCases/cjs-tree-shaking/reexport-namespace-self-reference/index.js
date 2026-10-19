const lib = require("./lib.cjs");

it("marks the self-references of a module used through a namespace re-export", () => {
	expect(lib.Signature.wrap("sig")).toBe("sig:magic:1");
});
