"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.oneOf(0, 1);
	stdout.should.be.ok();
	stderr.should.be.empty();
}
