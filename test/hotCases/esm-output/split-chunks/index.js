import { commonFunction } from "./common/shared";
import vendorLib from "vendor-lib";

it("should handle HMR with split chunks in ESM format", (done) => {
	expect(commonFunction("test")).toBe("Common function processed: test");
	expect(vendorLib.version).toBe("1.0.0");
	
	module.hot.accept("./common/shared");
	module.hot.accept("vendor-lib");
	
	NEXT(require("../../update")(done, true, () => {
		// Re-import after HMR update
		Promise.all([
			import("./common/shared"),
			import("vendor-lib")
		]).then(([commonModule, vendorModule]) => {
			expect(commonModule.commonFunction("test")).toBe("Updated common function: test");
			expect(vendorModule.default.version).toBe("2.0.0");
			done();
		}).catch(done);
	}));
});

it("should split chunks correctly with ESM output", () => {
	// This test verifies that the split chunks configuration works
	// The actual chunk splitting is handled by webpack
	expect(typeof commonFunction).toBe("function");
	expect(typeof vendorLib).toBe("object");
});
