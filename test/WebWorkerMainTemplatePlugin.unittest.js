"use strict";

const should = require("should");
const sinon = require("sinon");
const WebWorkerMainTemplatePlugin = require("../lib/webworker/WebWorkerMainTemplatePlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("WebWorkerMainTemplatePlugin", function() {
	let env;

	beforeEach(() => {
		env = {};
	});

	it("has apply function", function() {
		(new WebWorkerMainTemplatePlugin()).apply.should.be.a.Function();
	});

	describe("when applied", function() {
		beforeEach(function() {
			env.eventBindings = applyPluginWithOptions(WebWorkerMainTemplatePlugin);
			env.handlerContext = {
				requireFn: 'requireFn',
				indent: (value) => typeof value === 'string' ? value : value.join("\n"),
				asString: (values) => values.join("\n"),
				renderCurrentHashCode: (value) => value,
				outputOptions: {
					chunkFilename: 'chunkFilename'
				},
				applyPluginsWaterfall: (moduleName, fileName, data) => {
					return `"${moduleName}${data.hash}${data.hashWithLength()}${data.chunk && data.chunk.id || ''}"`;
				},
				renderAddModule: () => 'renderAddModuleSource();',
			};
		});

		it("binds five event handlers", function() {
			env.eventBindings.length.should.be.exactly(5);
		});

		describe("local-vars handler", function() {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[0];
			});

			it("binds to local-vars event", () => {
				env.eventBinding.name.should.be.exactly("local-vars");
			});

			describe("when no chunks are provided", () => {
				beforeEach(() => {
					const chunk = {
						ids: [],
						chunks: []
					};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk);
				});

				it("returns the original source", () => {
					env.source.should.be.exactly("moduleSource()")
				});
			});

			describe("when chunks are provided", () => {
				beforeEach(() => {
					const chunk = {
						ids: [1, 2, 3],
						chunks: [
							'foo',
							'bar',
							'baz'
						]
					};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk, 'abc123');
				});

				it("returns the original source with installed mapping", () => {
					env.source.should.be.exactly(`
moduleSource()

// object to store loaded chunks
// "1" means "already loaded"
var installedChunks = {
1: 1,
2: 1,
3: 1
};
`.trim())
				});
			});
		});

		describe("require-ensure handler", () => {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[1];
			});

			it("binds to require-ensure event", () => {
				env.eventBinding.name.should.be.exactly("require-ensure");
			});

			describe("when called", () => {
				beforeEach(() => {
					const chunk = {};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk, 'abc123');
				});

				it("creates import scripts call and promise resolve", () => {
					env.source.should.be.exactly(`
return new Promise(function(resolve) {
// "1" is the signal for "already loaded"
if(!installedChunks[chunkId]) {
importScripts("asset-path" + abc123 + "" + abc123 + "" + chunkId + "");
}
resolve();
});
`.trim())
				});
			});
		});

		describe("bootstrap handler", () => {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[2];
			});

			it("binds to bootstrap event", () => {
				env.eventBinding.name.should.be.exactly("bootstrap");
			});

			describe("when no chunks are provided", () => {
				beforeEach(() => {
					const chunk = {
						ids: [],
						chunks: []
					};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk);
				});

				it("returns the original source", () => {
					env.source.should.be.exactly("moduleSource()")
				});
			});

			describe("when chunks are provided", () => {
				beforeEach(() => {
					const chunk = {
						ids: [1, 2, 3],
						chunks: [
							'foo',
							'bar',
							'baz'
						]
					};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk);
				});

				it("returns the original source with chunk callback", () => {
					env.source.should.be.exactly(`
moduleSource()
this["webpackChunk"] = function webpackChunkCallback(chunkIds, moreModules) {
for(var moduleId in moreModules) {
renderAddModuleSource();
}
while(chunkIds.length)
installedChunks[chunkIds.pop()] = 1;
};
`.trim())
				});
			});
		});

		describe("hot-bootstrap handler", () => {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[3];
			});

			it("binds to hot-bootstrap event", () => {
				env.eventBinding.name.should.be.exactly("hot-bootstrap");
			});

			describe("when called", () => {
				beforeEach(() => {
					const chunk = {};
					env.source = env.eventBinding.handler.call(env.handlerContext, "moduleSource()", chunk, 'abc123');
				});

				it("returns the original source with hot update callback", () => {
					env.source.should.be.exactly(`
moduleSource()
var parentHotUpdateCallback = self["webpackHotUpdate"];
self["webpackHotUpdate"] = function webpackHotUpdateCallback(chunkId, moreModules) { // eslint-disable-line no-unused-vars
	hotAddUpdateChunk(chunkId, moreModules);
	if(parentHotUpdateCallback) parentHotUpdateCallback(chunkId, moreModules);
} ;

function hotDownloadUpdateChunk(chunkId) { // eslint-disable-line no-unused-vars
	importScripts(requireFn.p + "asset-path" + abc123 + "" + abc123 + "" + chunkId + "");
}

function hotDownloadManifest(requestTimeout) { // eslint-disable-line no-unused-vars
	requestTimeout = requestTimeout || 10000;
	return new Promise(function(resolve, reject) {
		if(typeof XMLHttpRequest === "undefined")
			return reject(new Error("No browser support"));
		try {
			var request = new XMLHttpRequest();
			var requestPath = requireFn.p + "asset-path" + abc123 + "" + abc123 + "";
			request.open("GET", requestPath, true);
			request.timeout = requestTimeout;
			request.send(null);
		} catch(err) {
			return reject(err);
		}
		request.onreadystatechange = function() {
			if(request.readyState !== 4) return;
			if(request.status === 0) {
				// timeout
				reject(new Error("Manifest request to " + requestPath + " timed out."));
			} else if(request.status === 404) {
				// no update available
				resolve();
			} else if(request.status !== 200 && request.status !== 304) {
				// other failure
				reject(new Error("Manifest request to " + requestPath + " failed."));
			} else {
				// success
				try {
					var update = JSON.parse(request.responseText);
				} catch(e) {
					reject(e);
					return;
				}
				resolve(update);
			}
		};
	});
}

function hotDisposeChunk(chunkId) { //eslint-disable-line no-unused-vars
	delete installedChunks[chunkId];
}
`.trim())
				});
			});
		});

		describe("hash handler", () => {
			beforeEach(() => {
				env.eventBinding = env.eventBindings[4];
				env.handlerContext = {
					outputOptions: {
						publicPath: "Alpha",
						filename: "Bravo",
						chunkFilename: "Charlie",
						chunkCallbackName: "Delta",
						library: "Echo"
					}
				};
				env.hashMock = {
					update: sinon.spy()
				};
				env.eventBinding.handler.call(env.handlerContext, env.hashMock);
			});

			it("binds to hash event", () => {
				env.eventBinding.name.should.be.exactly("hash");
			});

			it("updates hash object", () => {
				env.hashMock.update.callCount.should.be.exactly(7);
				sinon.assert.calledWith(env.hashMock.update, "webworker");
				sinon.assert.calledWith(env.hashMock.update, "3");
				sinon.assert.calledWith(env.hashMock.update, "Alpha");
				sinon.assert.calledWith(env.hashMock.update, "Bravo");
				sinon.assert.calledWith(env.hashMock.update, "Charlie");
				sinon.assert.calledWith(env.hashMock.update, "Delta");
				sinon.assert.calledWith(env.hashMock.update, "Echo");
			});
		});
	});
});
