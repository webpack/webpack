const STATE_SYM = Object.getOwnPropertySymbols(global).find(
	s => s.description === "JEST_STATE_SYMBOL"
);

module.exports = (globalTimeout = 2000, nameSuffix = "") => {
	const state = global[STATE_SYM];
	let currentDescribeBlock;
	let currentlyRunningTest;
	let runTests = -1;
	const disposables = [];

	// this function allows to release memory in fn context
	// manually, usually after the suite has been run.
	const createDisposableFn = (fn, isTest) => {
		if (!fn) return null;
		let rfn;
		if (fn.length >= 1) {
			rfn = done => {
				fn((...args) => {
					if (isTest) runTests++;
					done(...args);
				});
			};
		} else {
			rfn = () => {
				const r = fn();
				if (isTest) runTests++;
				return r;
			};
		}
		disposables.push(() => {
			fn = null;
		});
		return rfn;
	};

	describe(
		nameSuffix ? `exported tests ${nameSuffix}` : "exported tests",
		() => {
			jest.setTimeout(globalTimeout);
			// this must have a child to be handled correctly
			it("should run the exported tests", () => {
				runTests++;
			});
			afterAll(done => {
				for (const dispose of disposables) {
					dispose();
				}
				done();
			});
			currentDescribeBlock = state.currentDescribeBlock;
			currentlyRunningTest = state.currentlyRunningTest;
		}
	);
	let numberOfTests = 0;
	const inSuite = fn => {
		const {
			currentDescribeBlock: oldCurrentDescribeBlock,
			currentlyRunningTest: oldCurrentlyRunningTest,
			hasStarted: oldHasStarted
		} = state;
		state.currentDescribeBlock = currentDescribeBlock;
		state.currentlyRunningTest = currentlyRunningTest;
		state.hasStarted = false;
		fn();
		state.currentDescribeBlock = oldCurrentDescribeBlock;
		state.currentlyRunningTest = oldCurrentlyRunningTest;
		state.hasStarted = oldHasStarted;
	};
	return {
		setDefaultTimeout(time) {
			globalTimeout = time;
		},
		getNumberOfTests() {
			return numberOfTests;
		},
		it(...args) {
			numberOfTests++;
			if (runTests >= numberOfTests) throw new Error("it called too late");
			args[1] = createDisposableFn(args[1], true);
			inSuite(() => {
				it(...args);
			});
		},
		beforeEach(...args) {
			if (runTests >= numberOfTests)
				throw new Error("beforeEach called too late");
			args[0] = createDisposableFn(args[0]);
			inSuite(() => {
				beforeEach(...args);
			});
		},
		afterEach(...args) {
			if (runTests >= numberOfTests)
				throw new Error("afterEach called too late");
			args[0] = createDisposableFn(args[0]);
			inSuite(() => {
				afterEach(...args);
			});
		}
	};
};
