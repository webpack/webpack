"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[4].should.containEql("bytes"); // without uglifyjs it's multiple kBs

	stderr.should.be.empty();
};
