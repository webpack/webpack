"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.eql(0);

	stdout.should.be.ok();
	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Time: ");
	stdout[3].should.containEql("Environment (--env): ");
	stdout[5].should.containEql("null.js");
	stdout[6].should.containEql("./index.js");
	stdout[6].should.containEql("[built]");

	stderr.should.be.empty();
};
