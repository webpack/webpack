import { result as specifierResult } from "./export-specifier";
import { result as emptyResult } from "./export-empty";
import { result as reexportResult } from "./export-from";
import { result as starResult } from "./export-star";
import { result as defaultResult } from "./export-default-namespace";

it("should keep the semicolon ASI inserted before an erased export", () => {
	expect(specifierResult).toEqual([1, 2]);
	expect(emptyResult).toBe(6);
	expect(reexportResult).toEqual([4, 5]);
	expect(starResult).toEqual([6, 7]);
	expect(defaultResult).toEqual([8, 9]);
});

it('should keep the semicolon ASI inserted before a removed "use strict"', () => {
	expect(require("./use-strict-after-directive")).toBe(10);
});
