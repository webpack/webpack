it("should import the correct modules", () => {
	return import("./module").then(({ test }) => test());
});
