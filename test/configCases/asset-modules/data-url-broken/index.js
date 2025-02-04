it("should not crash", () => {
	let errored;

	try {
		const url = new URL(
		"unknown:test",
		import.meta.url
		);
	} catch (err) {
		errored = err;
	}

	expect(/Module build failed/.test(errored.message)).toBe(true);
});
