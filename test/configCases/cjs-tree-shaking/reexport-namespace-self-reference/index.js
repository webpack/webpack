const lib = require("./lib.cjs");

it("marks the self-references of a module used through a namespace re-export", () => {
	expect(lib.Signature.wrap("sig")).toBe("sig:magic:1");
});

it("keeps the re-export's own __esModule marker", () => {
	expect(lib.Signature.__esModule).toBe(true);
});

it("follows a namespace re-export of a namespace re-export", () => {
	expect(require("./deep/outer.cjs").Inner.Signature.wrap("sig")).toBe(
		"sig:deep:1"
	);
});

it("marks the self-references of a module with side effects", () => {
	expect(require("./effectful/lib.cjs").Signature.wrap("sig")).toBe(
		"sig:effectful:1"
	);
});
