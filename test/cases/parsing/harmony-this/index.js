"use strict";

import d, {a, b as B} from "./abc";

import * as abc from "./abc";

it("should have this undefined on imported functions", function() {
	(typeof d()).should.be.eql("undefined");
	(typeof a()).should.be.eql("undefined");
	(typeof B()).should.be.eql("undefined");
	abc.a().should.be.eql(abc);
});
