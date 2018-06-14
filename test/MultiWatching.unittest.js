"use strict";

const Tapable = require("tapable").Tapable;
const SyncHook = require("tapable").SyncHook;
const MultiWatching = require("../lib/MultiWatching");

const createWatching = () => {
	return {
		invalidate: jest.fn(),
		close: jest.fn()
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
	let watchings;
	let compiler;
	let myMultiWatching;

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
			expect(watchings[0].invalidate.mock.calls.length).toBe(1);
			expect(watchings[1].invalidate.mock.calls.length).toBe(1);
		});
	});

	describe("close", () => {
		let callback;
		const callClosedFinishedCallback = watching => {
			watching.close.mock.calls[0][0]();
		};

		beforeEach(() => {
			callback = jest.fn();
			myMultiWatching.close(callback);
		});

		it("closes each watching", () => {
			expect(watchings[0].close.mock.calls.length).toBe(1);
			expect(watchings[1].close.mock.calls.length).toBe(1);
		});

		it("calls callback after each watching has closed", () => {
			callClosedFinishedCallback(watchings[0]);
			callClosedFinishedCallback(watchings[1]);
			expect(callback.mock.calls.length).toBe(1);
		});
	});
});
