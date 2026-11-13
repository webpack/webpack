/**
 * @param {unknown} value the value to convert
 * @param {string[]} events the observable effects
 * @returns {void}
 */
function checkPrefix(value, events) {
	if ("prefix" + value) events.push("branch");
}

/**
 * @param {unknown} value the value to convert
 * @param {string[]} events the observable effects
 * @returns {void}
 */
function checkSuffix(value, events) {
	if (value + "suffix") events.push("branch");
}

it("should preserve toString effects before entering a truthy branch", () => {
	const events = [];
	checkPrefix(
		{
			toString() {
				events.push("convert");
				return "value";
			}
		},
		events
	);
	expect(events).toEqual(["convert", "branch"]);
});

it("should preserve valueOf effects with the string on the right", () => {
	const events = [];
	checkSuffix(
		{
			valueOf() {
				events.push("convert");
				return 1;
			}
		},
		events
	);
	expect(events).toEqual(["convert", "branch"]);
});

it("should preserve the default hint and order of primitive conversion", () => {
	const events = [];
	const value = {
		[Symbol.toPrimitive](hint) {
			events.push(hint);
			return "value";
		}
	};
	checkPrefix(value, events);
	checkSuffix(value, events);
	expect(events).toEqual(["default", "branch", "default", "branch"]);
});

it("should preserve errors thrown during conversion", () => {
	const events = [];
	const error = new Error("conversion failed");
	const value = {
		toString() {
			throw error;
		}
	};
	expect(() => checkPrefix(value, events)).toThrow(error);
	expect(() => checkSuffix(value, events)).toThrow(error);
	expect(events).toEqual([]);
});

it("should reject implicit string conversion of a symbol", () => {
	const events = [];
	expect(() => checkPrefix(Symbol("value"), events)).toThrow(TypeError);
	expect(() => checkSuffix(Symbol("value"), events)).toThrow(TypeError);
	expect(events).toEqual([]);
});

it("should still enter truthy branches for primitive values", () => {
	const events = [];
	checkPrefix(0, events);
	checkSuffix(null, events);
	checkPrefix(undefined, events);
	checkSuffix("", events);
	expect(events).toEqual(["branch", "branch", "branch", "branch"]);
});
