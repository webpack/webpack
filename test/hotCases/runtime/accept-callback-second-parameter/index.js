var value = require("./fileA");

it("should accept a dependency and receive the outdated dependency tree as the second parameter of the callback", function(done) {
	value.should.be.eql(1);

	var fileA_ModuleId = require.resolve('./fileA');
	var expectedOutdatedDependencyTree = {};
	expectedOutdatedDependencyTree[module.id] = [fileA_ModuleId];
	expectedOutdatedDependencyTree[fileA_ModuleId] = []; // empty array for leaf

	module.hot.accept("./fileA", function(__ignored__, outdatedDependencyTree) {
		value = require("./fileA");
		value.should.be.eql(2);
		outside();

		outdatedDependencyTree.should.be.eql(expectedOutdatedDependencyTree);

		done();
	});

	NEXT(require("../../update")(done));
});

function outside() {
	value.should.be.eql(2);
}
