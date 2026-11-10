it("issue-3769: should generate valid code", function() {
	expect(require("./module").myTest).toBe("test");
});
