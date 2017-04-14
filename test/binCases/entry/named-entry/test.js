"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[4].should.containEql("null.js");
	stdout[5].should.containEql("foo.js"); // named entry from --entry foo=./a.js
	stdout[6].should.match(/a\.js.*\{1\}/);
	stdout[7].should.match(/index\.js.*\{0\}/);
	stderr.should.be.empty();
};

