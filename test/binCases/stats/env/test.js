"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.eql(0);

	stdout.should.be.ok();
	stdout[2].should.containEql("Environment (--env): \u001b[1mfoobar\u001b[39m\u001b[22m");

	stderr.should.be.empty();
};
