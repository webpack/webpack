var value = require("./fileA");

it("should accept a dependency and receive the outdated module id as the first parameter of the callback", function(done) {
	value.should.be.eql(1);

	var fileA_ModuleId = require.resolve('./fileA');
	var expectedOutdatedModuleIds = [fileA_ModuleId];

	module.hot.accept("./fileA", function(outdatedModuleIds) {
		value = require("./fileA");
		value.should.be.eql(2);
		outside();

		outdatedModuleIds.should.be.eql(expectedOutdatedModuleIds);

		done();
	});

	NEXT(require("../../update")(done));
});

function outside() {
	value.should.be.eql(2);
}
