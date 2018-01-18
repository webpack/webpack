import complexModule from "complex-module";
import { log as complexModuleLog } from "complex-module/tracker";

it("should understand various `sideEffects` values", function() {
	complexModule.should.be.eql("def")
	complexModuleLog.should.be.eql([
		"./dirty.js",
		"./impure.js",
		"./src/x/y/z.js",
		"index.js",
	]);
});
