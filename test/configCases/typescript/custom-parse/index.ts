import { value } from "./module.ts";

const doubled: number = value * 2;

it("hands a custom parse function the source with its types blanked", () => {
	expect(doubled).toBe(4);
});

it("reads a CommonJS module's top-level return before a custom parse", () => {
	expect(require("./early-return.cts")).toBe(3);
});
