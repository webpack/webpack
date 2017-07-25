"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[5].should.containEql("./index2.js");
	stderr.should.be.empty();
};

