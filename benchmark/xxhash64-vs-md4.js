const createHash = require("../lib/util/createHash");

const compare = require("./micro-compare");

for (const size of [
	1, 10, 20, 40, 60, 80, 100, 200, 400, 1000, 1001, 5000, 8183, 8184, 8185,
	10000, 20000, 32768, 32769, 50000, 100000, 200000
]) {
	const longString = require("crypto").randomBytes(size).toString("hex");
	const buffer = require("crypto").randomBytes(size * 2);
	console.log(
		`string ${longString.length} chars: ` +
			compare(
				"wasm xxhash64",
				() => {
					const hash = createHash("xxhash64");
					hash.update(longString);
					return hash.digest("hex");
				},
				"wasm md4",
				() => {
					const hash = createHash("md4");
					hash.update(longString);
					return hash.digest("hex");
				}
			)
	);
	console.log(
		`buffer ${buffer.length} bytes: ` +
			compare(
				"wasm xxhash64",
				() => {
					const hash = createHash("xxhash64");
					hash.update(buffer);
					return hash.digest("hex");
				},
				"wasm md4",
				() => {
					const hash = createHash("md4");
					hash.update(buffer);
					return hash.digest("hex");
				}
			)
	);
}
