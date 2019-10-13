it("should not fail on optional externals", function() {
	try {
		require("external");
	} catch(e) {
		expect(e).toBeInstanceOf(Error);
		expect(e.code).toBe("MODULE_NOT_FOUND");
		return;
	}
	throw new Error("It doesn't fail");
});

it("should not fail on optional AMD externals", function() {
	try {
		require("external2");
	} catch(e) {
		expect(e).toBeInstanceOf(Error);
		expect(e.code).toBe("MODULE_NOT_FOUND");
		expect(e.message).toMatch(/target does not support AMD external dependencies/);
		return;
	}
	throw new Error("It doesn't fail");
});
