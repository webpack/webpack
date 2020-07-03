"use strict";

import { x, y } from "./a";
import {d2, usedD1, usedD2} from "./d.js";
import {b1, usedB1, usedB2, usedB3} from "./b.js";

it("namespace export as from commonjs should override named export", function() {
	expect(x).toBe(1);
	expect(y).toBe(3);
});

it("named namespace export should work correctly", function () {
	expect(d2).toBe(2);
	expect(usedD1).toBe(true); // TODO
	expect(usedD2).toBe(true);

	expect(b1.d2).toBe(2);
	expect(usedB1).toBe(true);
	expect(usedB2).toBe(false);
	expect(usedB3).toBe(false);
});
