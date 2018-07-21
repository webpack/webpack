"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.eql(0);
	stdout.should.be.ok();
	stderr.should.be.empty();
};
