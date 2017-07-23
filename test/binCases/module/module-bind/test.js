"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout.should.containEql("pre-loaded pre");
	stdout.should.containEql("post-loaded post");
	stderr.should.be.empty();
};
