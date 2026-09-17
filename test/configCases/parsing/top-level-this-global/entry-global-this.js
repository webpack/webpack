require("./common");

// built rather than written out, so the needle is not in the bundle it reads
const globalThisAccess = ["globalThis", "fromEntry"].join(".");
const runtimeGlobalAccess = ["__webpack_require__", "g", "fromEntry"].join(".");

it("should spell the global object as globalThis", () => {
	const source = require("fs").readFileSync(__filename, "utf8");

	expect(source).toContain(globalThisAccess);
	expect(source).not.toContain(runtimeGlobalAccess);
});

this.fromEntry = "entry";

it("should read the global object at the top level of the entry", () => {
	// bracket access, so the assertion is not itself a match above
	expect(globalThis["fromEntry"]).toBe("entry");
});
