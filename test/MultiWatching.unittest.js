"use strict";

const Tapable = require("tapable").Tapable;
const SyncHook = require("tapable").SyncHook;
const sinon = require("sinon");
const MultiWatching = require("../lib/MultiWatching");

const createWatching = () => {
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
		beforeEach(() => {
			myMultiWatching.invalidate();
		});

		it("invalidates each watching", () => {
			expect(watchings[0].invalidate.callCount).toBe(1);
			expect(watchings[1].invalidate.callCount).toBe(1);
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
			expect(watchings[0].close.callCount).toBe(1);
			expect(watchings[1].close.callCount).toBe(1);
		});

		it("calls callback after each watching has closed", () => {
			callClosedFinishedCallback(watchings[0]);
			callClosedFinishedCallback(watchings[1]);
			expect(callback.callCount).toBe(1);
		});
	});
});
