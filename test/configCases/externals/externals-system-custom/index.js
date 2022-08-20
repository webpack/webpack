// This test verifies that the System.register context is made available to webpack bundles

it("should correctly handle externals of different type", function() {
	expect(require("rootExt")).toEqual("works");
	expect(require("varExt")).toEqual("works");
	expect(require("windowExt")).toEqual("works");
});
