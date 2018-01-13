import falseModule from "false-module";
import { log as falseModuleLog } from "false-module/tracker";
import falseStringModule from "false-string-module";
import { log as falseStringModuleLog } from "false-string-module/tracker";
import usesGlobs from "uses-globs";
import { log as usesGlobsTracker } from "uses-globs/tracker";

it("should mark everything as side effect free", function() {
	// "sideEffects: false
	falseModule.should.be.eql("def")
	falseModuleLog.should.be.eql(["index.js"]);
});

it("should mark every module as side effect free except a file named \"false\"", function() {
	// "sideEffects": "false"
	falseStringModule.should.be.eql("def")
	falseStringModuleLog.should.be.eql(["false.js", "index.js"]);
});

it("should support glob expressions", function() {
	// "sideEffects": [...]
	usesGlobs.should.be.eql("def");
	usesGlobsTracker.should.be.eql([
		"index.js",
		"src/x/a.js",
	]);
});
