module.exports = (env, globalTimeout = 2000) => {
	const suite = env.describe("exported tests", () => {
		// this must have a child to be handled correctly
		env.it("should run the exported tests", () => {});
	});
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
			numberOfTests++;
			let spec;
			if(fn) {
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
			suite.beforeEach({
				fn,
				timeout: () => timeout
			});
		},
		afterEach(fn, timeout = globalTimeout) {
			suite.afterEach({
				fn,
				timeout: () => timeout
			});
		}
	};
};
