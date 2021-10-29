const { randomBytes, createHash } = require("crypto");

const wasmHashes = {
	xxhash64: () => {
		const createHash = require("../lib/util/hash/xxhash64");
		const createReferenceHash =
			require("hash-wasm/dist/xxhash64.umd.min.js").createXXHash64;
		return {
			createHash,
			createReferenceHash: async () => (await createReferenceHash()).init(),
			regExp: /^[0-9a-f]{16}$/
		};
	},
	md4: () => {
		const createMd4Hash = require("../lib/util/hash/md4");
		return {
			createHash: createMd4Hash,
			createReferenceHash:
				parseInt(process.version.slice(1), 10) < 17
					? async () => createHash("md4")
					: createMd4Hash,
			regExp: /^[0-9a-f]{32}$/
		};
	}
};

for (const name of Object.keys(wasmHashes)) {
	const { createHash, createReferenceHash, regExp } = wasmHashes[name]();

	describe(name, () => {
		const sizes = [
			1,
			2,
			3,
			4,
			5,
			7,
			8,
			9,
			16,
			31,
			32,
			33,
			64 - 10,
			64 - 9,
			64 - 8,
			63,
			64,
			65,
			100,
			1000,
			65536 - 1,
			65536,
			65536 + 1,
			65536 + 31,
			65536 * 5,
			65536 * 7 - 1,
			65536 * 9 + 31
		];

		const test = (name, sizes) => {
			it(name + " should generate a hash from binary data", async () => {
				const hash = createHash();
				const hashString = createHash();
				const reference = await createReferenceHash();
				for (const size of sizes) {
					const bytes = randomBytes(size);
					const string = bytes.toString("base64");
					hash.update(bytes);
					hashString.update(string, "base64");
					reference.update(bytes);
				}
				const result = hash.digest("hex");
				expect(result).toMatch(regExp);
				const resultFromString = hashString.digest("hex");
				expect(resultFromString).toMatch(regExp);
				const expected = reference.digest("hex");
				expect(result).toBe(expected);
				expect(resultFromString).toBe(expected);
			});
		};

		test("empty hash", []);

		for (const size of sizes) {
			test(`single update ${size} bytes`, [size]);
		}

		for (const size1 of sizes) {
			for (const size2 of sizes) {
				test(`two updates ${size1} + ${size2} bytes`, [size1, size2]);
			}
		}
		test(`many updates 1`, sizes);
		test(`many updates 2`, sizes.slice().reverse());
		test(`many updates 3`, sizes.concat(sizes.slice().reverse()));
		test(`many updates 4`, sizes.slice().reverse().concat(sizes));
	});
}
