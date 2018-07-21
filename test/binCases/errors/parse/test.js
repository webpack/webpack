"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.eql(2);

	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Time: ");
	stdout[5].should.containEql("./index.js");
	stdout[5].should.containEql("[built]");
	stdout[5].should.containEql("[failed]");
	stdout[5].should.containEql("[1 error]");
	stdout[7].should.containEql("ERROR in ./index.js");
	stdout[8].should.containEql("Module parse failed:");

	stderr.should.be.empty();
};
