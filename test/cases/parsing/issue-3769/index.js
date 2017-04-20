it("should generate valid code", function() {
	expect(require("./module").myTest).toEqual("test");
});
