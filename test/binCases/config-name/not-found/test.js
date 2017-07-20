"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(255);

	stdout.should.be.empty();
	stderr[0].should.containEql("Configuration with name \'foo\' was not found.");
};

