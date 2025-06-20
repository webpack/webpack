import update from "../../update.esm";
import.meta.webpackHot.accept(["./common/shared", "vendor-lib"]);

it("should handle HMR with split chunks in ESM format", (done) => {
	Promise.all([
		import("./common/shared"),
		import("vendor-lib")
	]).then(([commonModule, vendorModule]) => {
		expect(commonModule.commonFunction("test")).toBe("Common function processed: test");
		expect(vendorModule.default.version).toBe("1.0.0");
		done();
	}).catch(done);
		
	NEXT(update(done, true, () => {
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
