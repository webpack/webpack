"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(1);

	stdout.should.be.empty();

	stderr.should.be.ok();
	stderr[0].should.startWith("webpack");
	stderr.should.containEql("Unknown argument: myCustomArgument");

};
