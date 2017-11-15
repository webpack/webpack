"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Time: ");
	stdout[3].should.containEql("Environment (--env): \"foo\"");
	stdout[5].should.containEql("null.js");

	stderr.should.be.empty();
};
