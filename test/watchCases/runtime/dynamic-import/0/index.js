it("should change chunkhash of main chunk", function () {
	const mainChunk = STATS_JSON.chunks.find((chunk) => chunk.names.indexOf("main") !== -1);
	(!mainChunk).should.be.false("Main chunk not found");
	switch (WATCH_STEP) {
		case "0":
			STATE.hash = mainChunk.hash;
			break;
		case "1":
			mainChunk.hash.should.be.not.eql(STATE.hash);
			break;
	}
});

it("should load additional chunk", function() {
	const step = WATCH_STEP;
	return import(/* webpackChunkName: "dynamic" */ './dynamic')
		.then((dynamic) => {
			switch (step) {
				case "0":
					dynamic.default.should.be.eql("Normal");
					break;
				case "1":
					dynamic.default.should.be.eql("Changed");
					break;
			}
		});
});
