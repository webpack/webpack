"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.not.eql(0);

	stderr.should.not.be.empty();
	stderr[0].should.containEql("Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.");
};
