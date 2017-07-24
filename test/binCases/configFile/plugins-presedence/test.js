"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[6].should.containEql('ok.js')
	stderr.should.be.empty();
};
