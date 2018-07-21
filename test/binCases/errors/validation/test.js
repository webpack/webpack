"use strict";

module.exports = function(code, stdout, stderr) {
	stderr[0].should.containEql("Invalid configuration object");
};
