it("should report a phase a custom import function cannot express", () => {
	return import.defer("ext-defer").then((ns) => {
		expect(typeof ns).toBe("object");
	});
});
