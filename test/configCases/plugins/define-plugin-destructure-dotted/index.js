const { TRUTHY, ZERO, FALSE, NULL, PATTERN, SYNC, ASYNC } = process.env;

it("should destructure a dotted key of every value shape", () => {
	// a real `process.env` carries none of these, so reading them back is what
	// says the whole object was substituted at build time
	expect(TRUTHY).toBe("truthy");
	expect(ZERO).toBe(0);
	expect(FALSE).toBe(false);
	expect(NULL).toBe(null);
	expect(PATTERN).toEqual(/^a$/);
	expect(SYNC).toBe("sync");
	expect(ASYNC).toBe("async");
});

it("should still fold a member read of the same keys", () => {
	// a member read is folded, so these branches are pruned and the requests
	// they hold never resolve
	if (process.env.ZERO !== 0) require("./this-file-does-not-exist");
	if (process.env.ASYNC !== "async") require("./this-file-does-not-exist");
	expect(process.env.ZERO).toBe(0);
});

it("should leave a key that renders to no code unsubstituted", () => {
	// its own statement: one unusable id abandons the whole destructuring
	const { EMPTY } = process.env;
	expect(EMPTY).toBe(undefined);
});
