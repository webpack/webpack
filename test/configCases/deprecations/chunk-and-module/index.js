import { testExport as importedTestExport } from "./index";

export const testExport = 'chunk-and-module';

it("should compile with deprecations", () => {
	expect(importedTestExport).toBe('chunk-and-module');
});
