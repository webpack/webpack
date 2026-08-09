const data = require("./data.json");
const nested = require("./nested.json");
const numbers = require("./numbers.json");

const usedExportsOf = (file) =>
	__STATS__.modules.find((m) => m.name.endsWith(file)).usedExports;

it("should reference the whole value for a non-provided prototype method", () => {
	// `includes` is no export of the array, so the array itself is referenced
	expect(numbers.includes(2)).toBe(true);
	expect(numbers.length).toBe(3);
});

it("should trim a member-access path at the first non-provided segment", () => {
	// `hasOwnProperty` is no export of `list`, so all of `list` is referenced —
	// nothing else here reads `list`, so an untrimmed path would empty it
	expect(nested.list.hasOwnProperty("a")).toBe(true);
	expect(nested.list.hasOwnProperty("b")).toBe(true);
	expect(usedExportsOf("nested.json")).not.toContain("unused");
});

it("should keep a provided leaf export and drop the rest", () => {
	expect(data.leaf).toBe("kept");
	expect(usedExportsOf("data.json")).not.toContain("unused");
});
