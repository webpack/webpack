"use strict";

module.exports = function(code, stdout, stderr) {
	code.should.be.eql(1);
	stdout.should.be.empty();

	stderr[1].should.containEql("Commons Chunk Plugin Invalid Options");

	stderr[3].should.containEql("options should be string");
	stderr[4].should.containEql("options should be array");
	stderr[5].should.containEql("options['foo'] should NOT have additional properties");
	stderr[6].should.containEql("options should match exactly one schema in oneOf");
};
