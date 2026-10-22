import "./other";

const data = require("data");

/**
 * The plugin resets the progress with an empty 0 as a build or the cache wakes
 * up, and reaches 1 as it goes idle or shuts down.
 * @returns {{ value: number, messages: string[] }[][]} the calls of each stretch between those
 */
const stretches = () => {
	const result = [[]];
	for (const call of data) {
		if (call.value === 0 && call.messages[0] === "") result.push([]);
		result[result.length - 1].push(call);
		if (call.value === 1) result.push([]);
	}
	return result.filter((calls) => calls.length > 0);
};

it("should report every progress as a number from 0 to 1", () => {
	expect(data.length).toBeGreaterThan(20);
	for (const { value } of data) {
		expect(Number.isFinite(value)).toBe(true);
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThanOrEqual(1);
	}
});

it("should only ever increase the progress between resets", () => {
	for (const calls of stretches()) {
		let last = calls[0];
		for (const call of calls) {
			if (call.value < last.value) {
				throw new Error(
					`Progress is not monotonic:\n${last.value} ${last.messages.join(" ")}\n${call.value} ${call.messages.join(" ")}`
				);
			}
			last = call;
		}
	}
});

it("should report the module factory hooks of the compiler", () => {
	const percentOf = (message) =>
		data
			.filter((call) => call.messages[1] === message)
			.map((call) => Math.floor(call.value * 100));
	expect(percentOf("normal module factory")).toContain(4);
	expect(percentOf("context module factory")).toContain(5);
});

it("should count entries, dependencies, modules and active modules", () => {
	const counts = data
		.filter((call) => call.messages[0] === "building")
		.map((call) => call.messages[1]);
	expect(counts).toContainEqual(
		expect.stringMatching(
			/^\d+\/\d+ entries \d+\/\d+ dependencies \d+\/\d+ modules \d+ active$/
		)
	);
	expect(counts).toContain("1/1 entries 3/3 dependencies 3/3 modules 0 active");
});
