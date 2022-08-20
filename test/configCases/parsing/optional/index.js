it("should not fail for optional modules with bail", () => {
	let error;
	try {
		require("./not-existing");
	} catch (e) {
		error = e;
	}
	expect(() => {
		throw error;
	}).toThrowError();
});
