"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Time: ");
	stdout[5].should.containEql("./index.js");

	stderr.should.be.empty();
};
