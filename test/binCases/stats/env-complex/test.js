"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	code.should.be.eql(0);

	stdout.should.be.ok();
	stdout[2].should.containEql("Environment (--env): \u001b[1m{");
	stdout[3].should.containEql("\"production\": true,");
	stdout[4].should.containEql("\"platform\": \"\'web\'\",");
	stdout[5].should.containEql("\"version\": 2");
	stdout[6].should.containEql("}\u001b[39m\u001b[22m");

	stderr.should.be.empty();
};
