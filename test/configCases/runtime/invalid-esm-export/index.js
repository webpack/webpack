it("should throw exception when module.exports is assigned in es module", function() {
	expect(function() {
		require("./esm-import-cjs-export");
	}).toThrowError(
		'ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ./esm-import-cjs-export.js'
	);
});
