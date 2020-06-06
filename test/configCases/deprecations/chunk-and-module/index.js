import { testExport as importedTestExport } from "./index";

export const testExport = 42;

it("should compile with deprecations", () => {
	expect(importedTestExport).toBe(42);
});
