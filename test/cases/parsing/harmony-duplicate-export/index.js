import { x as x1 } from "./1";
import { x as x2 } from "./2";
import { x as x3 } from "./3";
import { x as x4 } from "./4";
import { x as x5 } from "./5";
import { x as x6 } from "./6";
import { x as x7 } from "./7";

var y1 = require("./cjs/1").x;
var y2 = require("./cjs/2").x;
var y3 = require("./cjs/3").x;
var y4 = require("./cjs/4").x;
var y5 = require("./cjs/5").x;
var y6 = require("./cjs/6").x;
var y7 = require("./cjs/7").x;

it("should not overwrite when using star export (known exports)", function () {
	expect(x1).toBe("1");
	expect(x2).toBe("1");
	expect(x3).toBe("a");
	expect(x4).toBe("b");
	expect(x5).toBe("c");
	expect(x6).toBe("a");
	expect(x7).toBe("b"); // Looks wrong, but is irrelevant as this is an error anyway
});

it("should not overwrite when using star export (unknown exports)", function () {
	expect(y1).toBe("1");
	expect(y2).toBe("1");
	expect(y3).toBe("a");
	expect(y4).toBe("b");
	expect(y5).toBe("c");
	expect(y6).toBe("a");
	expect(y7).toBe("b"); // Looks wrong, but is irrelevant as this is an error anyway
});
