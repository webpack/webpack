 const createHash = require("../lib/util/createHash");
const crypto = require("crypto");
const compare = require("./micro-compare");

const size = 50;
const strings = [];

// Pre-generate random strings
for (let count = 1; strings.length < 10000; count++) {
	const s = crypto.randomBytes(size).toString("hex");
	strings.push(s);
}

// Function to benchmark a hashing method
function benchmark(label, hashFunction, iterations) {
	let totalTime = BigInt(0);
	let i = 0;

	// Warm-up phase
	for (let j = 0; j < 1000; j++) {
		const hash = hashFunction(strings[i++ % strings.length]);
	}

	// Benchmark phase
	for (let j = 0; j < iterations; j++) {
		const start = process.hrtime.bigint();
		hashFunction(strings[i++ % strings.length]);
		const end = process.hrtime.bigint();
		totalTime += end - start;
	}

	const avgTime = totalTime / BigInt(iterations);
	console.log(`${label}: ${iterations} iterations, avg time: ${avgTime} ns`);
	return avgTime;
}

// Hashing functions
function nativeMd4Hash(input) {
	const hash = createHash("native-md4");
	hash.update(input);
	hash.update(input);
	return hash.digest("hex");
}

function wasmMd4Hash(input) {
	const hash = createHash("md4");
	hash.update(input);
	hash.update(input);
	return hash.digest("hex");
}

// Main comparison
const iterations = 100000;
console.log(`Benchmarking with ${iterations} iterations:`);
const nativeMd4Time = benchmark("Native MD4", nativeMd4Hash, iterations);
const wasmMd4Time = benchmark("WASM MD4", wasmMd4Hash, iterations);

console.log("\nResults:");
if (nativeMd4Time < wasmMd4Time) {
	console.log("Native MD4 is faster by", wasmMd4Time - nativeMd4Time, "ns per iteration.");
} else {
	console.log("WASM MD4 is faster by", nativeMd4Time - wasmMd4Time, "ns per iteration.");
}
