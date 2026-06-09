it("should warn when the worker entry option is used in import()", async () => {
	const { value } = await import(
		/* webpackEntryOptions: { worker: true } */ "./module.js"
	);
	expect(value).toBe("ok");
});
