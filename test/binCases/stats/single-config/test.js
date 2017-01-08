"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.oneOf(0, 1);

	stdout.length.should.be.exactly(2);

	const dateOutput = stdout[0].toString();
	dateOutput.should.be.ok();
	isNaN(new Date(dateOutput)).should.be.false();

	const buildOutput = stdout[1].toString();
	buildOutput.should.be.ok();
	buildOutput.should.startWith("Hash: ");
	buildOutput.should.containEql("\nVersion:");
	buildOutput.should.containEql("\nTime:");
	buildOutput.should.containEql("null.js");
	buildOutput.should.containEql("./index.js");
	buildOutput.should.containEql("[built]");

	stderr.map((data) => {
		data.toString().should.be.ok();
		throw new Error(data.toString());
	});
}
