const STATE_SYM = Object.getOwnPropertySymbols(global).find(
	Symbol("x").description
		? s => s.description === "JEST_STATE_SYMBOL"
		: s => s.toString() === "Symbol(JEST_STATE_SYMBOL)"
);
if (!STATE_SYM) {
	throw new Error(
		`Unable to find JEST_STATE_SYMBOL in ${Object.getOwnPropertySymbols(global)
			.map(s => s.toString())
			.join(", ")}`
	);
}

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
		try {
			fn();
		} catch (e) {
			// avoid leaking memory
			e.stack;
			throw e;
		}
		state.currentDescribeBlock = oldCurrentDescribeBlock;
		state.currentlyRunningTest = oldCurrentlyRunningTest;
		state.hasStarted = oldHasStarted;
	};
	const fixAsyncError = block => {
		// By default jest leaks memory as it stores asyncError
		// for each "it" call to track the origin test suite
		// We want to evaluate this early here to avoid leaking memory
		block.asyncError = {
			stack: block.asyncError.stack
		};
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
			args[2] = args[2] || globalTimeout;
			inSuite(() => {
				it(...args);
				fixAsyncError(
					currentDescribeBlock.tests[currentDescribeBlock.tests.length - 1]
				);
			});
		},
		beforeEach(...args) {
			if (runTests >= numberOfTests)
				throw new Error("beforeEach called too late");
			args[0] = createDisposableFn(args[0]);
			inSuite(() => {
				beforeEach(...args);
				fixAsyncError(
					currentDescribeBlock.hooks[currentDescribeBlock.hooks.length - 1]
				);
			});
		},
		afterEach(...args) {
			if (runTests >= numberOfTests)
				throw new Error("afterEach called too late");
			args[0] = createDisposableFn(args[0]);
			inSuite(() => {
				afterEach(...args);
				fixAsyncError(
					currentDescribeBlock.hooks[currentDescribeBlock.hooks.length - 1]
				);
			});
		}
	};
};
