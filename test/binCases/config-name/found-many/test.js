"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[7].should.containEql("./index2.js");
	stdout[13].should.containEql("./index3.js");
	stderr.should.be.empty();
};

