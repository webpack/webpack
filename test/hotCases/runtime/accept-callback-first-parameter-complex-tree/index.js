var values = require('./root');

it("should accept dependencies and receive the outdated module ids as the first parameter of the callback", function(done) {
	values.valueA.should.be.eql(1);
	values.valueB.should.be.eql(1);
	values.valueC.should.be.eql(6);
	values.valueD.should.be.eql(12);

	var rootModuleId = require.resolve('./root');
	var expectedOutdatedModuleIds = [rootModuleId];

	module.hot.accept("./root", function(outdatedModuleIds) {
		values = require("./root");

		values.valueA.should.be.eql(2);
		values.valueB.should.be.eql(1);
		values.valueC.should.be.eql(7);
		values.valueD.should.be.eql(14);

		outsideA();
		outsideB();
		outsideC();
		outsideD();

		outdatedModuleIds.should.be.eql(expectedOutdatedModuleIds);

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
	values.valueD.should.be.eql(14);
}
