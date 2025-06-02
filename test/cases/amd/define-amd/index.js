if (typeof define === "function" && define.amd && require.amd) {
	define("my-module", [], function () {
		return 'my-module';
	});
}


it("should work with `define.amd`", function(done) {
	require(["my-module"], function (myModule) {
		expect(myModule).toBe("my-module");
		done();
	});
});
