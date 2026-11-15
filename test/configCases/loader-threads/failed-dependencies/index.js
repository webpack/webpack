it("reports the loader failure while keeping its dependencies", () => {
	expect(() => require("./value")).toThrow();
});
