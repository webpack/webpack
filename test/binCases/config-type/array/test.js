"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Child");
	stdout[6].should.containEql("entry-a.bundle.js");
	stdout[8].should.containEql("Child");
	stdout[12].should.containEql("entry-b.bundle.js");

	stderr.should.be.empty();
};
