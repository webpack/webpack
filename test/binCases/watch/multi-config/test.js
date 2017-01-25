"use strict";

module.exports = function testAssertions(stdout, stderr, done) {
	stdout.should.be.ok();
	stdout[0].should.containEql("");
	stdout[1].should.containEql("Webpack is watching the files…");

	stderr.should.be.empty();
	done();
};
