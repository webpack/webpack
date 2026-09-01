import { fromImport, fromRequire, textFromRequire } from "./consumer";

it("should read an inlinable constant through the import", () => {
	expect(fromImport).toBe(42);
});

it("should keep the same constant readable off the required exports object", () => {
	expect(fromRequire).toBe(42);
	expect(textFromRequire).toBe("text");
});
