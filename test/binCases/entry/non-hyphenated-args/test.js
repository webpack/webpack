"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[4].should.containEql("null.js");
	stdout[5].should.containEql("main.js"); // non-hyphenated arg ./a.js should create chunk "main"
	stdout[6].should.match(/index\.js.*\{0\}/); // index.js should be in chunk 0
	stdout[7].should.match(/a\.js.*\{1\}/); // a.js should be in chunk 1
	stderr.should.be.empty();
};

