it("should load single file modules", function() {
	expect(require("subfilemodule")).toEqual("subfilemodule");
});
