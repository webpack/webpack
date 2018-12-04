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

if (process.env.ALTERNATIVE_SORT) {
	const oldSort = Array.prototype.sort;

	Array.prototype.sort = function(cmp) {
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
