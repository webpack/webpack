// this function allows to release memory in fn context
// after the function has been called.
const createOnceFn = fn => {
	if (!fn) return null;
	if (fn.length >= 1) {
		return done => {
			fn(done);
			fn = null;
		};
	}
	return () => {
		const r = fn();
		fn = null;
		return r;
	};
};

// this function allows to release memory in fn context
// manually, usually after the suite has been run.
const createDisposableFn = fn => {
	if (!fn) return null;
	let rfn;
	if (fn.length >= 1) {
		rfn = done => {
			fn(done);
		};
	} else {
		rfn = () => {
			return fn();
		};
	}
	rfn.dispose = () => {
		fn = null;
	};
	return rfn;
};

module.exports = (env, globalTimeout = 2000, nameSuffix = "") => {
	const suite = env.describe(
		nameSuffix ? `exported tests ${nameSuffix}` : "exported tests",
		() => {
			// this must have a child to be handled correctly
			env.it("should run the exported tests", () => {});
		}
	);
	let numberOfTests = 0;
	const beforeAndAfterFns = () => {
		let currentSuite = suite;
		let afters = [];
		let befores = [];

		while (currentSuite) {
			befores = befores.concat(currentSuite.beforeFns);
			afters = afters.concat(currentSuite.afterFns);

			currentSuite = currentSuite.parentSuite;
		}

		return {
			befores: befores.reverse(),
			afters: afters
		};
	};
	return {
		setDefaultTimeout(time) {
			globalTimeout = time;
		},
		getNumberOfTests() {
			return numberOfTests;
		},
		it(title, fn, timeout = globalTimeout) {
			fn = createOnceFn(fn);
			numberOfTests++;
			let spec;
			if (fn) {
				spec = env.fit(title, fn, timeout);
			} else {
				spec = env.fit(title, () => {});
				spec.pend("Skipped");
			}
			suite.addChild(spec);
			spec.disabled = false;
			spec.getSpecName = () => {
				return `${suite.getFullName()} ${spec.description}`;
			};
			spec.beforeAndAfterFns = beforeAndAfterFns;
			spec.result.fullName = spec.getFullName();
		},
		beforeEach(fn, timeout = globalTimeout) {
			fn = createDisposableFn(fn);
			suite.beforeEach({
				fn,
				timeout: () => timeout
			});
			suite.afterAll({
				fn: done => {
					fn.dispose();
					done();
				},
				timeout: () => 1000
			});
		},
		afterEach(fn, timeout = globalTimeout) {
			fn = createDisposableFn(fn);
			suite.afterEach({
				fn,
				timeout: () => timeout
			});
			suite.afterAll({
				fn: done => {
					fn.dispose();
					done();
				},
				timeout: () => 1000
			});
		}
	};
};
