import { value } from "./consumer";

it("should re-generate an unchanged importer when mangled exports shift", () => {
	expect(value).toBe("B");
});
