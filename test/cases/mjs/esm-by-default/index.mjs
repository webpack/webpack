it("should not have commonjs stuff available", function() {
	if(typeof module !== "undefined") { // If module is available
		module.should.have.property("webpackTestSuiteModule"); // it must be the node.js module
	}
	if(typeof require !== "undefined") { // If require is available
		require.should.have.property("webpackTestSuiteRequire"); // it must be the node.js require
	}
});
