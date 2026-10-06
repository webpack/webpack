const fs = require("fs");
const path = require("path");

// Reads the `producers` custom sections: how many, and the last one's fields.
const readProducers = (binary) => {
	let offset = 8;
	const u32 = () => {
		let result = 0;
		for (let shift = 0; ; shift += 7) {
			const byte = binary[offset++];
			result |= (byte & 0x7f) << shift;
			if (!(byte & 0x80)) return result;
		}
	};
	const name = () => {
		const length = u32();
		const value = binary.toString("utf8", offset, offset + length);
		offset += length;
		return value;
	};
	let producers;
	let count = 0;
	while (offset < binary.length) {
		const id = binary[offset++];
		const size = u32();
		const end = offset + size;
		if (id === 0 && name() === "producers") {
			count++;
			producers = {};
			for (let fields = u32(); fields > 0; fields--) {
				const field = name();
				producers[field] = [];
				for (let values = u32(); values > 0; values--) {
					producers[field].push([name(), name()]);
				}
			}
		}
		offset = end;
	}
	return { count, producers: producers || {} };
};

const emitted = () =>
	fs
		.readdirSync(__dirname)
		.filter((file) => file.endsWith(".wasm"))
		.map((file) => readProducers(fs.readFileSync(path.join(__dirname, file))));

const { version } = require("../../../../package.json");

it("should add webpack as a producer to a module without the section", async () => {
	const module = await import("./plain.wat");
	expect(module.answer()).toBe(42);
	const plain = emitted().filter(({ producers }) => !producers.language);
	expect(plain).toHaveLength(1);
	expect(plain[0].count).toBe(1);
	expect(plain[0].producers).toEqual({
		"processed-by": [["webpack", version]]
	});
});

it("should keep the producers a module already names", async () => {
	const module = await import("./with-producers.wasm");
	expect(module.answer()).toBe(42);
	const named = emitted().filter(({ producers }) => producers.language);
	expect(named).toHaveLength(1);
	expect(named[0].count).toBe(1);
	expect(named[0].producers).toEqual({
		language: [["Rust", "1.70.0"]],
		"processed-by": [
			["rustc", "1.70.0"],
			["webpack", version]
		]
	});
});
