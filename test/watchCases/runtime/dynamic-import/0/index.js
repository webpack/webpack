it("should change chunkhash of main chunk", function () {
	const mainChunk = STATS_JSON.chunks.find((chunk) => chunk.names.indexOf("main") !== -1);
	expect(mainChunk).toBeDefined();
	switch (WATCH_STEP) {
		case "0":
			STATE.hash = mainChunk.hash;
			break;
		case "1":
			expect(mainChunk.hash).not.toBe(STATE.hash);
			break;
	}
});

it("should load additional chunk", function() {
	const step = WATCH_STEP;
	return import(/* webpackChunkName: "dynamic" */ './dynamic')
		.then((dynamic) => {
			switch (step) {
				case "0":
					expect(dynamic.default).toBe("Normal");
					break;
				case "1":
					expect(dynamic.default).toBe("Changed");
					break;
			}
		});
});
