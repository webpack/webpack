"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.exactly(0);

	stdout.should.be.ok();
	stdout[0].should.containEql("Hash: ");
	stdout[1].should.containEql("Version: ");
	stdout[2].should.containEql("Time: ");
	stdout[3].should.containEql("Environment (--env): {");
	stdout[4].should.containEql("\"prod\": [");
	stdout[7].should.containEql("],");
	stdout[8].should.containEql("\"baz\": true");
	stdout[9].should.containEql("}");
	stdout[11].should.containEql("null.js");
	stdout[12].should.containEql("./index.js");
	stdout[12].should.containEql("[built]");

	stderr.should.be.empty();
};
