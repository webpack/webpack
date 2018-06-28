/* globals expect */
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
	}
});
