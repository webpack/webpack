"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	stderr.should.be.empty();
	code.should.be.eql(0);

	stdout.should.be.empty();
};
