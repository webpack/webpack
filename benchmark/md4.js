 const createHash = require("../lib/util/createHash");
const crypto = require("crypto");

function benchmark(label, hashFunction, iterations = 1000) {
	let totalTime = BigInt(0);
	let warmup = 100;

	// Warm-up phase
	for (let i = 0; i < warmup; i++) {
		hashFunction();
	}

	// Benchmark phase
	for (let i = 0; i < iterations; i++) {
		const start = process.hrtime.bigint();
		hashFunction();
		const end = process.hrtime.bigint();
		totalTime += end - start;
	}

	const avgTime = totalTime / BigInt(iterations);
	return Number(avgTime); // Convert nanoseconds to number for readability
}

function compare(label1, func1, label2, func2, iterations) {
	const time1 = benchmark(label1, func1, iterations);
	const time2 = benchmark(label2, func2, iterations);
	const faster = time1 < time2 ? label1 : label2;

	console.log(
		`${label1}: ${time1} ns | ${label2}: ${time2} ns | Faster: ${faster}`
	);
}

function hashTestSuite(sizes, iterations) {
	for (const size of sizes) {
		const longString = crypto.randomBytes(size).toString("hex");
		const buffer = crypto.randomBytes(size);

		console.log(`\n### Testing size: ${size} ###`);

		// Test with strings
		console.log(`String (${longString.length} chars):`);
		compare(
			"Native MD4",
			() => {
				const hash = createHash("native-md4");
				hash.update(longString);
				hash.update(longString);
				hash.digest("hex");
			},
			"WASM MD4",
			() => {
				const hash = createHash("md4");
				hash.update(longString);
				hash.update(longString);
				hash.digest("hex");
			},
			iterations
		);

		// Test with buffers
		console.log(`Buffer (${buffer.length} bytes):`);
		compare(
			"Native MD4",
			() => {
				const hash = createHash("native-md4");
				hash.update(buffer);
				hash.update(buffer);
				hash.digest("hex");
			},
			"WASM MD4",
			() => {
				const hash = createHash("md4");
				hash.update(buffer);
				hash.update(buffer);
				hash.digest("hex");
			},
			iterations
		);
	}
}

// Configurations
const sizes = [
	1, 10, 20, 40, 60, 80, 100, 200, 400, 1000, 1001, 5000, 8183, 8184, 8185,
	10000, 20000, 32768, 32769, 50000, 100000, 200000,
];
const iterations = 1000;

// Run the tests
hashTestSuite(sizes, iterations);
