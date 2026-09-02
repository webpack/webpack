// The imports live in `entry.js` so this module stays synchronous: an async
// index registers its tests where the runner cannot await them.
it("should handle mixed defer/non-defer targets correctly", async () => {
	const { directValue, deferredShared } = await require("./entry.js");

	expect(typeof directValue).toBe("string");
	expect(directValue).toBe("shared-value");

	expect(typeof deferredShared).toBe("object");
	expect(deferredShared).not.toBe(null);
	expect(deferredShared.value).toBe("shared-value");

	// Both should access the same underlying value
	expect(directValue).toBe(deferredShared.value);
});

it("should handle mixed defer/non-defer targets with async correctly", async () => {
	const { directValueAsync, deferredSharedAsync } =
		await require("./entry.js");

	expect(typeof directValueAsync).toBe("string");
	expect(directValueAsync).toBe("shared-value-async");

	expect(deferredSharedAsync).not.toBeInstanceOf(Promise);
	((m) => {
		expect(m.value).toBe("shared-value-async");
	})(deferredSharedAsync);

	// Both should access the same underlying value
	expect(directValueAsync).toBe(deferredSharedAsync.value);
});
