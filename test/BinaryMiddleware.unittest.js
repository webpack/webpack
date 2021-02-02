const BinaryMiddleware = require("../lib/serialization/BinaryMiddleware");
const SerializerMiddleware = require("../lib/serialization/SerializerMiddleware");

const cont = (base, count) => {
	const result = [];
	for (let i = 0; i < count; i++) {
		result.push(base[i % base.length]);
	}
	return result;
};

const mw = new BinaryMiddleware();
const other = { other: true };

const resolveLazy = item => {
	if (SerializerMiddleware.isLazy(item)) {
		const data = item();
		if (Array.isArray(data)) return { resolvesTo: data.map(resolveLazy) };
		return { resolvesTo: resolveLazy(data) };
	}
	return item;
};

describe("BinaryMiddleware", () => {
	const items = [
		true,
		false,
		null,
		"",
		"hi",
		"hi".repeat(200),
		"😀",
		"😀".repeat(200),
		Buffer.from("hello"),
		1,
		11,
		0x100,
		-1,
		-11,
		-0x100,
		-1.25,
		SerializerMiddleware.createLazy([5], other),
		SerializerMiddleware.createLazy(
			[SerializerMiddleware.createLazy([5], other)],
			mw
		),
		SerializerMiddleware.createLazy(
			[
				1,
				SerializerMiddleware.createLazy([2], mw),
				SerializerMiddleware.createLazy([5], other),
				4
			],
			mw
		)
	];
	items.push(SerializerMiddleware.createLazy(items.slice(), mw));
	items.push(SerializerMiddleware.createLazy(items.slice(), other));
	items.push(undefined);

	const cases = [
		...items.map(item => [item]),
		[(true, true)],
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
		cont([true], 135),
		[null],
		[null, null],
		[null, null, null],
		cont([null], 4),
		cont([null], 100),
		cont([null], 300),
		cont([-20], 20),
		cont([400], 20),
		cont([5.5], 20)
	];

	for (const caseData of cases) {
		for (const prepend of items) {
			for (const append of items) {
				const data = [prepend, ...caseData, append].filter(
					x => x !== undefined
				);
				if (data.length === 0) continue;
				const key = JSON.stringify(data.map(resolveLazy));
				it(`should serialize ${key} (${data.length}) correctly`, () => {
					const serialized = mw.serialize(data, {});
					const newData = mw.deserialize(serialized, {});
					expect(newData.map(resolveLazy)).toEqual(data.map(resolveLazy));
				});
			}
		}
	}
});
