it("should generate valid code when 'require' encounters object shorthand syntax", function() {
	expect(require("./module").obj.require).toEqual(require("./module").obj.r);
	expect(require("./module").obj.require).toBeTypeOf("function");
});
