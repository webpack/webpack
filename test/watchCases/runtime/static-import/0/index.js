require("should");

import * as both from './dynamic-and-static'
import * as staticModule from './static'

it("should not change chunkhash of manifest chunk", function () {
	const manifestChunk = STATS_JSON.chunks.find((chunk) => chunk.names.indexOf("runtime~main") !== -1);
	(!manifestChunk).should.be.false("Main chunk not found");
	switch (WATCH_STEP) {
		case "0":
			STATE.hash = manifestChunk.hash;
			staticModule.should.be.eql("Normal");
			both.should.be.eql("Normal");
			break;
		case "1":
			manifestChunk.hash.should.be.eql(STATE.hash);
			staticModule.should.be.eql("Changed");
			both.should.be.eql("Normal");
			break;
		case "2":
			manifestChunk.hash.should.be.eql(STATE.hash);
			staticModule.should.be.eql("Changed");
			both.should.be.eql("Changed");
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
					dynamic.default.should.be.eql("Normal");
					break;
				case "2":
					dynamic.default.should.be.eql("Changed");
					break;
			}
		});
});
