expect.extend({
	toBeTypeOf(received, expected) {
		const objType = typeof received;
		const pass = objType === expected;

		const message = pass
			? () =>
					this.utils.matcherHint(".not.toBeTypeOf") +
					"\n\n" +
					"Expected value to not be (using typeof):\n" +
					`  ${this.utils.printExpected(expected)}\n` +
					"Received:\n" +
					`  ${this.utils.printReceived(objType)}`
			: () =>
					this.utils.matcherHint(".toBeTypeOf") +
					"\n\n" +
					"Expected value to be (using typeof):\n" +
					`  ${this.utils.printExpected(expected)}\n` +
					"Received:\n" +
					`  ${this.utils.printReceived(objType)}`;

		return { message, pass };
	},
	toEndWith(received, expected) {
		const pass = typeof received === "string" && received.endsWith(expected);

		const message = pass
			? () =>
					this.utils.matcherHint(".not.toEndWith") +
					"\n\n" +
					"Expected value to not end with:\n" +
					`  ${this.utils.printExpected(expected)}\n` +
					"Received:\n" +
					`  ${this.utils.printReceived(received)}`
			: () =>
					this.utils.matcherHint(".toEndWith") +
					"\n\n" +
					"Expected value to end with:\n" +
					`  ${this.utils.printExpected(expected)}\n` +
					"Received:\n" +
					`  ${this.utils.printReceived(received)}`;

		return { message, pass };
	}
});

if (process.env.ALTERNATIVE_SORT) {
	const oldSort = Array.prototype.sort;

	Array.prototype.sort = function (cmp) {
		oldSort.call(this, cmp);
		if (cmp) {
			for (let i = 1; i < this.length; i++) {
				if (cmp(this[i - 1], this[i]) === 0) {
					let j = i + 1;
					for (; j < this.length; j++) {
						if (cmp(this[j - 1], this[j]) !== 0) {
							break;
						}
					}
					for (let x = i - 1, y = j - 1; x < y; x++, y--) {
						const temp = this[x];
						this[x] = this[y];
						this[y] = temp;
					}
					i = j;
				}
			}
		}
		return this;
	};
}

// Setup debugging info for tests
if (process.env.DEBUG_INFO) {
	const addDebugInfo = it => {
		return (name, fn, timeout) => {
			if (fn.length === 0) {
				it(
					name,
					() => {
						process.stdout.write(`START1 ${name}\n`);
						try {
							const promise = fn();
							if (promise && promise.then) {
								return promise.then(
									r => {
										process.stdout.write(`DONE OK ${name}\n`);
										return r;
									},
									e => {
										process.stdout.write(`DONE FAIL ${name}\n`);
										throw e;
									}
								);
							} else {
								process.stdout.write(`DONE OK ${name}\n`);
							}
						} catch (e) {
							process.stdout.write(`DONE FAIL ${name}\n`);
							throw e;
						}
					},
					timeout
				);
			} else {
				it(
					name,
					done => {
						process.stdout.write(`START2 ${name}\n`);
						return fn(err => {
							if (err) {
								process.stdout.write(`DONE FAIL ${name}\n`);
							} else {
								process.stdout.write(`DONE OK ${name}\n`);
							}
							return done(err);
						});
					},
					timeout
				);
			}
		};
	};
	const env = jasmine.getEnv();
	env.it = addDebugInfo(env.it);
}

// Workaround for a memory leak in wabt
// It leaks an Error object on construction
// so it leaks the whole stack trace
require("wast-loader");
process.removeAllListeners("uncaughtException");
process.removeAllListeners("unhandledRejection");
