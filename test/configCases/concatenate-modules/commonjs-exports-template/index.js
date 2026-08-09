import * as cjs from "./cjs";
import * as viaThis from "./this-cjs";

it("should keep used exports and self-references working", () => {
	expect(cjs.used).toBe("used");
	expect(cjs.readBack).toBe("used!");
});

it("should keep a `this`-based self-reference working", () => {
	expect(viaThis.readThis).toBe("viaThis!");
});
