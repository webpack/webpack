"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[0].should.startWith("webpack");
	stdout.should.containEql("Config options:");
	stdout.should.containEql("Basic options:");
	stdout.should.containEql("Module options:");
	stdout.should.containEql("Output options:");
	stdout.should.containEql("Advanced options:");
	stdout.should.containEql("Resolving options:");
	stdout.should.containEql("Optimizing options:");
	stdout.should.containEql("Stats options:");
	stdout.should.containEql("Options:");

	stderr.should.be.empty();
};
