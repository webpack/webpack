import { log as booleanValueModuleLog } from "boolean-value-module/tracker";
import booleanValueModule from "boolean-value-module";
import { log as globValueModuleLog } from "glob-value-module/tracker";
import globValueModule from "glob-value-module";

it("should handle a boolean", function() {
	booleanValueModule.should.be.eql("def");
	booleanValueModuleLog.should.be.eql(["index.js"]);
});

it("should handle globs", function() {
	globValueModule.should.be.eql("def");
	globValueModuleLog.should.be.eql([
		"./src/a.js",
		"a.js",
		"index.js",
	]);
});
