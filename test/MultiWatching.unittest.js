"use strict";

const SyncHook = require("tapable").SyncHook;
const MultiWatching = require("../lib/MultiWatching");

const createWatching = () => ({
	invalidate: jest.fn(),
	suspend: jest.fn(),
	resume: jest.fn(),
	close: jest.fn()
});

const createCompiler = () => {
	const compiler = {
		hooks: {
			watchClose: new SyncHook([])
		}
	};
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
			expect(watchings[0].invalidate).toHaveBeenCalledTimes(1);
			expect(watchings[1].invalidate).toHaveBeenCalledTimes(1);
		});
	});

	describe("suspend", () => {
		it("suspends each watching", () => {
			myMultiWatching.suspend();
			expect(watchings[0].suspend).toHaveBeenCalledTimes(1);
			expect(watchings[1].suspend).toHaveBeenCalledTimes(1);
		});

		it("resume each watching", () => {
			myMultiWatching.resume();
			expect(watchings[0].resume).toHaveBeenCalledTimes(1);
			expect(watchings[1].resume).toHaveBeenCalledTimes(1);
		});
	});

	describe("close", () => {
		let callback;
		const callClosedFinishedCallback = (watching) => {
			watching.close.mock.calls[0][0]();
		};

		beforeEach(() => {
			callback = jest.fn();
			myMultiWatching.close(callback);
		});

		it("closes each watching", () => {
			expect(watchings[0].close).toHaveBeenCalledTimes(1);
			expect(watchings[1].close).toHaveBeenCalledTimes(1);
		});

		it("calls callback after each watching has closed", () => {
			callClosedFinishedCallback(watchings[0]);
			callClosedFinishedCallback(watchings[1]);
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});
});
