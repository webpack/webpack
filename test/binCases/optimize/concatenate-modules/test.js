"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[5].should.containEql("./index.js + 1 module");
	stdout[6].should.not.containEql("./a.js");

	stderr.should.be.empty();
};
