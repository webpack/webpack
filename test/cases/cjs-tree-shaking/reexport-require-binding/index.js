import { ns as whole } from "./reexport-whole";
import { ns as viaSpecifier } from "./reexport-specifier";
import { picked, flag } from "./partial";
import { ns as viaExports, a, lazy } from "./reexport-cjs";

it("should keep the whole exports object when an `export const` require binding is re-exported (#21135)", () => {
	expect(whole.a).toBe("a");
	expect(whole.b).toBe("b");
	// Re-exporting the binding lets the value escape, so nothing may be shaken.
	expect(whole.usedExports).toBe(true);
});

it("should keep the whole exports object when a require binding is re-exported via a specifier (#21135)", () => {
	expect(viaSpecifier.a).toBe("a");
	expect(viaSpecifier.b).toBe("b");
	expect(viaSpecifier.usedExports).toBe(true);
});

it("should still tree-shake when only specific members of a require binding are re-exported", () => {
	expect(picked).toBe("a");
	// `b` is never touched, so it is shaken out of the required module.
	expect(flag).toEqual(["a", "usedExports"]);
});

it("should tree-shake a require binding assigned to CommonJS exports", () => {
	expect(viaExports.a).toBe("a");
	expect(a).toBe("a");
	expect(lazy.a).toBe("a");
	// The binding is re-exported, so only reads through the re-export count.
	expect(viaExports.usedExports).toEqual(["a", "usedExports"]);
});
