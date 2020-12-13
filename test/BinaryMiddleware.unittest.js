const BinaryMiddleware = require("../lib/serialization/BinaryMiddleware");

const cont = (base, count) => {
	const result = [];
	for (let i = 0; i < count; i++) {
		result.push(base[i % base.length]);
	}
	return result;
};

describe("BinaryMiddleware", () => {
	const cases = [
		[true],
		[false],
		[null],
		[""],
		["hi"],
		[Buffer.from("hello")],
		[1],
		[11],
		[0x100],
		[-1],
		[-11],
		[-0x100],
		[-1.25],
		[true, true],
		[false, true],
		[true, false],
		[false, false],
		[false, false, false],
		[false, true, false, true],
		[true, true, true],
		[false, false, false],
		cont([false, true, false, true], 5),
		cont([true], 5),
		cont([false], 5),
		cont([false, true, false, true], 6),
		cont([true], 6),
		cont([false], 6),
		cont([false, true, false, true], 7),
		cont([false, true, false, true], 8),
		cont([false, true, false, true], 9),
		cont([false, true, false, true], 132),
		cont([false, true, false, true], 133),
		cont([false, true, false, true], 134),
		cont([false, true, false, true], 135),
		cont([true], 135)
	];

	const items = [
		undefined,
		true,
		false,
		null,
		"",
		"hi",
		Buffer.from("hello"),
		1,
		11,
		0x100,
		-1,
		-11,
		-0x100,
		-1.25
	];

	for (const caseData of cases) {
		for (const prepend of items) {
			for (const append of items) {
				const data = [prepend, ...caseData, append].filter(
					x => x !== undefined
				);
				const key = JSON.stringify(data);
				it(`should serialize ${key} (${data.length}) correctly`, () => {
					const mw = new BinaryMiddleware();
					const serialized = mw.serialize(data, {});
					const newData = mw.deserialize(serialized, {});
					expect(newData).toEqual(data);
				});
			}
		}
	}
});
