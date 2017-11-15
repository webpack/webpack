var should = require("should");
import d from "testPackage/d";
import d2 from "./d";
import { x1, y2 } from "./e";
import { x2, y1 } from "testPackage/e";
import mod from "module-with-closure-state/index";
import h from "testPackage/h";

it("should load a module from dll", function() {
    require("testPackage/a.js").should.be.eql("a");
});

it("should load an async module from dll", function(done) {
    require("testPackage/b")().then(function(c) {
        c.should.be.eql({ default: "c" });
        done();
    }).catch(done);
});

it("should load an harmony module from dll (default export)", function() {
    d.should.be.eql("d");
});

it("should differentiate between local files and files from dependencies with the same name", function() {
    d2.should.be.eql("d-local");
});

it("should load an harmony module from dll (star export)", function() {
    x1.should.be.eql(123);
    x2.should.be.eql(123);
    y1.should.be.eql(456);
    y2.should.be.eql(456);
});

it("should load a module with loader applied", function() {
    require("testPackage/g.abc.js").should.be.eql("number");
});

it("should share the same node_modules with the dll", function() {
    mod.get().should.be.eql("default");
    h();
    mod.get().should.be.eql("set inside dll");
});
