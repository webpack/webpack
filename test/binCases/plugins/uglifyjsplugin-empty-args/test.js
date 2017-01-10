"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
  code.should.be.exactly(0);

  stdout.should.be.ok();
  stdout[3].should.containEql("Hash: ");
  stdout[4].should.containEql("Version: ");
  stdout[5].should.containEql("Time: ");
  stdout[7].should.containEql("null.js");
  stdout[8].should.containEql("./index.js");
  stdout[8].should.containEql("[built]");

  stderr.should.be.empty();
}
