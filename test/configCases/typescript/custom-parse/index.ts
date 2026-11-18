import { value } from "./module.ts";

const doubled: number = value * 2;

it("hands a custom parse function the source with its types blanked", () => {
	expect(doubled).toBe(4);
});
