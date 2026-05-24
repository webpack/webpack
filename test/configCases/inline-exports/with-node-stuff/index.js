import { en, global as userGlobal } from "./module";

const generated = /** @type {string} */ (
	__non_webpack_require__("fs").readFileSync(__filename, "utf-8")
);

it("should have correct exports", () => {
	expect(en.global).toBe("global");
	// START:A
	expect(userGlobal).toBe("global");
	// END:A
	expect(global).toBeInstanceOf(Object);
});

it("should be inlined for userGlobal", () => {
	const block = generated.match(/\/\/ START:A([\s\S]*)\/\/ END:A/)[1];
	expect(block.includes(`((/* inlined export .global */"global"))`)).toBe(true);
});
