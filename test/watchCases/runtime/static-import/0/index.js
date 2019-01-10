import * as both from './dynamic-and-static'
import * as staticModule from './static'

it("should not change chunkhash of manifest chunk", function () {
	const manifestChunk = STATS_JSON.chunks.find((chunk) => chunk.names.indexOf("runtime~main") !== -1);
	expect(!manifestChunk).toBe(false);
	switch (WATCH_STEP) {
		case "0":
			STATE.hash = manifestChunk.hash;
			expect(staticModule).toBe("Normal");
			expect(both).toBe("Normal");
			break;
		case "1":
			expect(manifestChunk.hash).toBe(STATE.hash);
			expect(staticModule).toBe("Changed");
			expect(both).toBe("Normal");
			break;
		case "2":
			expect(manifestChunk.hash).toBe(STATE.hash);
			expect(staticModule).toBe("Changed");
			expect(both).toBe("Changed");
			break;
	}
});

it("should load additional chunk", function() {
	const step = WATCH_STEP;
	return import(/* webpackChunkName: "dynamic-and-static" */ './dynamic-and-static')
		.then((dynamic) => {
			switch (step) {
				case "0":
				case "1":
					expect(dynamic.default).toBe("Normal");
					break;
				case "2":
					expect(dynamic.default).toBe("Changed");
					break;
			}
		});
});
