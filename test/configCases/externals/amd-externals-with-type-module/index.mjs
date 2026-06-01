import defaultExport, { namedExport } from "external-dependency";

it("should correctly unbox AMD external when type is module", function() {
	expect(defaultExport).toBe("default-value");
	expect(namedExport).toBe("named-value");
});
