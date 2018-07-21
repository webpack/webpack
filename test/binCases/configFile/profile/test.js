"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[6].should.containEql("factory:");
	stdout[8].should.containEql("factory:");
	stdout[10].should.containEql("factory:");

	stderr.should.be.empty();
};
