it("should substitute a value an async generator produced", () => {
	expect(ASYNC_NUMBER).toBe(42);
	expect(typeof ASYNC_NUMBER).toBe("number");
	expect(PROMISED_STRING).toBe("promised");
});

it("should preserve resolved values that are null, undefined or false", () => {
	expect(ASYNC_UNDEFINED).toBe(undefined);
	expect(ASYNC_NULL).toBe(null);
	expect(ASYNC_FALSE).toBe(false);
});

it("should support one runtime value shared across plugin instances", () => {
	expect(SHARED_FIRST).toBe("SHARED_FIRST");
	expect(SHARED_SECOND).toBe("SHARED_SECOND");
});

it("should have the value while the module is parsed", () => {
	// a value resolved after the parse could not prune these branches, and the
	// requests they hold do not resolve
	if (ASYNC_NUMBER !== 42) require("./this-file-does-not-exist");
	if (typeof ASYNC_NUMBER !== "number") require("./this-file-does-not-exist");
	if (PROMISED_STRING !== "promised") require("./this-file-does-not-exist");
	expect(ASYNC_NUMBER).toBe(42);
});

it("should get the argument a synchronous generator gets", () => {
	expect(ASYNC_MODULE_IS_A_MODULE).toBe(true);
	expect(ASYNC_KEY).toBe("ASYNC_KEY");
	expect(ASYNC_VERSION).toBe("v1");
});

it("should support a typeof definition", () => {
	expect(typeof ASYNC_TYPEOF).toBe("magic");
	if (typeof ASYNC_TYPEOF !== "magic") require("./this-file-does-not-exist");
});

it("should support file dependencies", () => {
	expect(ASYNC_FROM_FILE).toBe("from-a-file");
});

it("should support a value inside an object definition", () => {
	expect(ASYNC_OBJECT.nested).toBe("nested");
	// rendered as a whole object, where the value is keyed by its member name
	expect(ASYNC_OBJECT).toEqual({ nested: "nested" });
});

it("should support destructuring an object definition", () => {
	const { nested } = ASYNC_OBJECT;
	expect(nested).toBe("nested");
});

it("should support a value inside an array definition", () => {
	expect(ASYNC_ARRAY[0]).toBe("first");
	// rendered as a whole array, where the value keeps the key of the array
	expect(ASYNC_ARRAY).toEqual(["first"]);
});

it("should support a dotted definition key", () => {
	expect(ASYNC_DOTTED.deep).toBe("deep");
});
