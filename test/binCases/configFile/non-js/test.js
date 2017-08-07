"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.not.eql(0);
	stdout.should.be.empty();
	stderr[4].should.containEql("Cannot resolve config file. Install appropriate compiler and try again.");
};
