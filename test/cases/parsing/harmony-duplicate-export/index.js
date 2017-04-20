import { x as x1 } from "./1?a";
import { x as x2 } from "./2?a";
import { x as x3 } from "./3?a";
import { x as x4 } from "./4?a";
import { x as x5 } from "./5?a";
import { x as x6 } from "./6?a";
import { x as x7 } from "./7?a";

var y1 = require("./1?b").x;
var y2 = require("./2?b").x;
var y3 = require("./3?b").x;
var y4 = require("./4?b").x;
var y5 = require("./5?b").x;
var y6 = require("./6?b").x;
var y7 = require("./7?b").x;

it("should not overwrite when using star export (known exports)", function() {
	expect(x1).toEqual("1");
	expect(x2).toEqual("1");
	expect(x3).toEqual("a");
	expect(x4).toEqual("b");
	expect(x5).toEqual("c");
	expect(x6).toEqual("a");
	expect(x7).toEqual("d");
});

it("should not overwrite when using star export (unknown exports)", function() {
	expect(y1).toEqual("1");
	expect(y2).toEqual("1");
	expect(y3).toEqual("a");
	expect(y4).toEqual("b");
	expect(y5).toEqual("c");
	expect(y6).toEqual("a");
	expect(y7).toEqual("d");
});
