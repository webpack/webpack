"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.eql(0);

	stdout.should.be.ok();
	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Environment: foobar");
	stdout[3].should.containEql("Time: ");
	stdout[5].should.containEql("\u001b[1m\u001b[32mnull.js\u001b[39m\u001b[22m");
	stdout[6].should.not.containEql("./index.js");
	stdout[6].should.not.containEql("[built]");
	stdout[6].should.containEql("1 hidden module");

	stderr.should.be.empty();
};
