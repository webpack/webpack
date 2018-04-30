var should = require("should");
import d from "../0-create-dll/d";
import { x1, y2 } from "./e";
import { x2, y1 } from "../0-create-dll/e";

it("should load a module from dll", function() {
	require("../0-create-dll/a").should.be.eql("a");
});

it("should load an async module from dll", function(done) {
	require("../0-create-dll/b")().then(function(c) {
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
	require("../0-create-dll/g.abc.js").should.be.eql("number");
});


