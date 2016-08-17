var should = require("should");
import d from "dll/d";
import { x, y } from "dll/e";

it("should load a module from dll", function() {
	require("dll/a").should.be.eql("a");
});

it("should load an async module from dll", function() {
	require("dll/b")().then(function(c) {
		c.should.be.eql({ default: "c" });
	});
});

it("should load an harmony module from dll (default export)", function() {
	d.should.be.eql("d");
});

it("should load an harmony module from dll (star export)", function() {
	x.should.be.eql(123);
	y.should.be.eql(456);
});
