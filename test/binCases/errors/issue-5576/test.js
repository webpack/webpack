"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.eql(2);

	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Time: ");
	stdout[4].should.containEql("ERROR in Entry module not found: Error: Can't resolve");

	stderr.should.be.empty();
};

