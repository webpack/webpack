it("should define an async runtime value loaded from a file", function () {
	expect(ASYNC_FILE_VALUE).toEqual({
		file: "async-value",
		key: "ASYNC_FILE_VALUE",
		version: "unset",
		hasModule: false
	});
});

it("should define an async runtime value nested in an object", function () {
	expect(ASYNC_OBJECT).toEqual({ nested: "nested-async" });
});

it("should resolve parallel async runtime values before parsing", function () {
	expect(ASYNC_PARALLEL).toEqual({
		key: "ASYNC_PARALLEL",
		version: "custom-version"
	});
});

it("should keep the async value usable in expressions", function () {
	expect(`${ASYNC_FILE_VALUE.file}`).toBe("async-value");
});

it("should resolve one instance shared by two keys only once", function () {
	expect(ASYNC_SHARED_A).toBe("shared-async");
	expect(ASYNC_SHARED_B).toBe("shared-async");
});