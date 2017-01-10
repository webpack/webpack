"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.oneOf(0, 1);

	console.log(stdout);

	stdout.should.be.ok();

	stderr.should.be.empty();
}
