var values = require('./root');

it("should accept dependencies and receive the outdated module dependency tree as the second parameter of the callback", function(done) {
	values.valueA.should.be.eql(1);
	values.valueB.should.be.eql(1);
	values.valueC.should.be.eql(6);
	values.valueD.should.be.eql(3);

	var rootModuleId = require.resolve('./root');
	var valueA_ModuleId = require.resolve('./valueA');
	var valueC_ModuleId = require.resolve('./valueC');
	var valueD_ModuleId = require.resolve('./valueD');

	var expectedOutdatedDependencyTree = {};
	expectedOutdatedDependencyTree[module.id] = [rootModuleId];

	// because c and d require from their parent (root), their order will be inverted
	expectedOutdatedDependencyTree[rootModuleId] = [valueA_ModuleId, valueD_ModuleId, valueC_ModuleId];

	expectedOutdatedDependencyTree[valueA_ModuleId] = []; // empty array for leaves
	expectedOutdatedDependencyTree[valueC_ModuleId] = [rootModuleId]; // will only have [root] as a child because root will already be in the tree and continuing would create a loop
	expectedOutdatedDependencyTree[valueD_ModuleId] = [rootModuleId]; // will only have [root] as a child because root will already be in the tree and continuing would create a loop

	module.hot.accept("./root", function(outdatedModuleIds, outdatedDependencyTree) {
		values = require('./root');

		values.valueA.should.be.eql(2);
		values.valueB.should.be.eql(1);
		values.valueC.should.be.eql(7);
		values.valueD.should.be.eql(6);

		outsideA();
		outsideB();
		outsideC();
		outsideD();

		outdatedDependencyTree.should.be.eql(expectedOutdatedDependencyTree);

		done();
	});

	NEXT(require("../../update")(done));
});

function outsideA() {
	values.valueA.should.be.eql(2);
}

function outsideB() {
	values.valueB.should.be.eql(1);
}

function outsideC() {
	values.valueC.should.be.eql(7);
}

function outsideD() {
	values.valueD.should.be.eql(6);
}
