"use strict";

const Tapable = require("tapable").Tapable;
const SyncHook = require("tapable").SyncHook;
require("should");
const sinon = require("sinon");
const MultiWatching = require("../lib/MultiWatching");

const createWatching = function() {
	return {
		invalidate: sinon.spy(),
		close: sinon.spy()
	};
};

const createCompiler = () => {
	const compiler = {
		hooks: {
			watchClose: new SyncHook([])
		}
	};
	Tapable.addCompatLayer(compiler);
	return compiler;
};

describe("MultiWatching", () => {
	let watchings, compiler, myMultiWatching;

	beforeEach(() => {
		watchings = [createWatching(), createWatching()];
		compiler = createCompiler();
		myMultiWatching = new MultiWatching(watchings, compiler);
	});

	describe("invalidate", () => {
		beforeEach(() => myMultiWatching.invalidate());

		it("invalidates each watching", () => {
			watchings[0].invalidate.callCount.should.be.exactly(1);
			watchings[1].invalidate.callCount.should.be.exactly(1);
		});
	});

	describe("close", () => {
		let callback;
		const callClosedFinishedCallback = watching =>
			watching.close.getCall(0).args[0]();

		beforeEach(() => {
			callback = sinon.spy();
			myMultiWatching.close(callback);
		});

		it("closes each watching", () => {
			watchings[0].close.callCount.should.be.exactly(1);
			watchings[1].close.callCount.should.be.exactly(1);
		});

		it("calls callback after each watching has closed", () => {
			callClosedFinishedCallback(watchings[0]);
			callClosedFinishedCallback(watchings[1]);
			callback.callCount.should.be.exactly(1);
		});
	});
});
