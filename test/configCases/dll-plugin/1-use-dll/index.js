var should = require("should");
import d from "dll/d";
import { x1, y2 } from "./e";
import { x2, y1 } from "dll/e";

it("should load a module from dll", function() {
	require("dll/a").should.be.eql("a");
});

it("should load a module of non-default type without extension from dll", function() {
	require("dll/f").should.be.eql("f");
});

it("should load an async module from dll", function(done) {
	require("dll/b")().then(function(c) {
		c.should.be.eql({ default: "c" });
		done();
	}).catch(done);
});

it("should load an harmony module from dll (default export)", function() {
	d.should.be.eql("d");
});

it("should load an harmony module from dll (star export)", function() {
	x1.should.be.eql(123);
	x2.should.be.eql(123);
	y1.should.be.eql(456);
	y2.should.be.eql(456);
});

it("should load a module with loader applied", function() {
	require("dll/g.abc.js").should.be.eql("number");
});

it("should give modules the correct ids", function() {
	Object.keys(__webpack_modules__).filter(m => !m.startsWith("../..")).should.be.eql([
		"./index.js",
		"dll-reference ../0-create-dll/dll.js",
		"dll/a.js",
		"dll/b.js",
		"dll/d.js",
		"dll/e.js",
		"dll/e1.js",
		"dll/e2.js",
		"dll/f.jsx",
		"dll/g.abc.js"
    ]);
});
