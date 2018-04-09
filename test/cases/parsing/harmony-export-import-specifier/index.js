"use strict";

import {x, y} from "./a";

it("namespace export as from commonjs should override named export", function() {
	x.should.be.eql(1);
	y.should.be.eql(3);
});
