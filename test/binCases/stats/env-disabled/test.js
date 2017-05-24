"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.eql(0);

	stdout.should.be.ok();
	stdout[2].should.not.containEql("Environment (--env): ");

	stderr.should.be.empty();
};
