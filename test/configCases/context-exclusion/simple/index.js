function requireInContext(someVariable) {
	return require(`./some-dir/${someVariable}`);
}

it("should not exclude paths not matching the exclusion pattern", function() {
	expect(requireInContext("file")).toBe("thats good");
	expect(requireInContext("check-here/file")).toBe("thats good");
	expect(requireInContext("check-here/check-here/file")).toBe("thats good");
});

it("should exclude paths/files matching the exclusion pattern", function() {
		expect(() => requireInContext("dont")).toThrowError(/Cannot find module '.\/dont'/);

		expect(() => requireInContext("dont-check-here/file")).toThrowError(/Cannot find module '.\/dont-check-here\/file'/);

		expect(() => requireInContext("check-here/dont-check-here/file")).toThrowError(/Cannot find module '.\/check-here\/dont-check-here\/file'/);
});
