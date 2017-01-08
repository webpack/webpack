"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.length.should.be.exactly(1);
	const output = stdout[0].toString();

	output.should.be.ok();
	output.should.startWith("webpack");
	output.should.containEql("\nConfig options:");
	output.should.containEql("\nBasic options:");
	output.should.containEql("\nModule options:");
	output.should.containEql("\nOutput options:");
	output.should.containEql("\nAdvanced options:");
	output.should.containEql("\nResolving options:");
	output.should.containEql("\nOptimizing options:");
	output.should.containEql("\nStats options:");
	output.should.containEql("\nOptions:");

	stderr.map((data) => {
		data.toString().should.be.ok();
		throw new Error(data.toString());
	});
}
