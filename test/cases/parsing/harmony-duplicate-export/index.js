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
	x1.should.be.eql("1");
	x2.should.be.eql("1");
	x3.should.be.eql("a");
	x4.should.be.eql("b");
	x5.should.be.eql("c");
	x6.should.be.eql("a");
	x7.should.be.eql("d");
});

it("should not overwrite when using star export (unknown exports)", function() {
	y1.should.be.eql("1");
	y2.should.be.eql("1");
	y3.should.be.eql("a");
	y4.should.be.eql("b");
	y5.should.be.eql("c");
	y6.should.be.eql("a");
	y7.should.be.eql("d");
});
