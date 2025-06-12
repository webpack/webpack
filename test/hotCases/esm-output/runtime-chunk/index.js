import { sharedData } from "./shared";

it("should handle HMR with runtime chunk in ESM format", (done) => {
	expect(sharedData.version).toBe("1.0.0");
	
	module.hot.accept("./shared");
	
	NEXT(require("../../update")(done, true, () => {
		import("./shared").then(updatedModule => {
			expect(updatedModule.sharedData.version).toBe("2.0.0");
			done();
		}).catch(done);
	}));
});

it("should load async shared module with runtime chunk", (done) => {
	import("./async-shared").then(module => {
		expect(module.asyncData.loaded).toBe(true);
		expect(module.asyncData.content).toBe("Async shared content");
		done();
	}).catch(done);
});
