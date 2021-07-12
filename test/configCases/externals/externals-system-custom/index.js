/* This test verifies that webpack externals that have different to System type are properly
 * accessible within System.js bundle.
 */
it("should correctly handle externals of different type", function() {
	expect(require("rootExt")).toEqual("works");
	expect(require("varExt")).toEqual("works");
	expect(require("windowExt")).toEqual("works");
});
