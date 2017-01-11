"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.oneOf(0, 1);

	stdout.should.be.ok();
	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Time: ");
	stdout[4].should.containEql("null.js");
	stdout[5].should.containEql("./index.js");
	stdout[5].should.containEql("[built]");

	stderr.should.be.empty();
};
