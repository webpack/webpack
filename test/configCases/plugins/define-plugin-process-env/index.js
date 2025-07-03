it("destructuring should work with 'process.env'", function () {
	expect(process.env.NODE_ENV).toBe("production");

	const { NODE_ENV } = process.env;
	expect(NODE_ENV).toBe("production");

	const { NODE_ENV: RENAME_NODE_ENV } = process.env;
	expect(RENAME_NODE_ENV).toBe("production");

	const { NODE_ENV: OTHER_RENAME_NODE_ENV, UNKNOWN } = process.env;
	expect(OTHER_RENAME_NODE_ENV).not.toBe("production");
	expect(UNKNOWN).toBeUndefined();

	expect(process.env.ENVIRONMENT).toBe("node");

	const { ENVIRONMENT } = process.env;
	expect(ENVIRONMENT).toBe("node");

	const { ENVIRONMENT: RENAME_ENVIRONMENT } = process.env;
	expect(RENAME_ENVIRONMENT).toBe("node");

	const { ENVIRONMENT: OTHER_RENAME_ENVIRONMENT, OTHER_UNKNOWN } = process.env;
	expect(OTHER_RENAME_ENVIRONMENT).toBeUndefined();
	expect(OTHER_UNKNOWN).toBeUndefined();
});
