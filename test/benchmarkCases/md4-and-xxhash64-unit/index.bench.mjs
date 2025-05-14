import crypto from "crypto";
import createHash from "../../../lib/util/createHash.js";

const NS_PER_MS = 1000000; // 1ms
const MAX_WARMUP_DURATION = NS_PER_MS; // 1ms

// eslint-disable-next-line no-unused-vars
let result;

function measure(fn, count) {
	const start = process.hrtime.bigint();
	for (let i = 0; i < count; i++) result = fn();
	return Number(process.hrtime.bigint() - start);
}

function factoryOnStart(f1, f2) {
	return function onStart() {
		const count = 1;

		while (true) {
			const timings = [f1, f2, f1, f2, f1, f2].map(f => measure(f, count));
			const t1 = Math.min(timings[0], timings[2], timings[4]);
			const t2 = Math.min(timings[1], timings[3], timings[5]);

			if (
				count === 1 &&
				(t1 > MAX_WARMUP_DURATION || t2 > MAX_WARMUP_DURATION)
			) {
				continue;
			}

			break;
		}
	};
}

function factoryXxhash64(longString) {
	return function xxhash64String() {
		const hash = createHash("xxhash64");
		hash.update(longString);
		return hash.digest("hex");
	};
}

function factoryMd4(longString) {
	return function md4String() {
		const hash = createHash("md4");
		hash.update(longString);
		return hash.digest("hex");
	};
}

export default function xxhash64AndMd4Benchmarks(suite) {
	for (const size of [
		1, 10, 20, 40, 60, 80, 100, 200, 400, 1000, 1001, 5000, 8183, 8184, 8185,
		10000, 20000, 32768, 32769, 50000, 100000, 200000
	]) {
		const longString = crypto.randomBytes(size).toString("hex");
		const subName1 = `string benchmark (length: ${longString.length})`;

		const fn1 = factoryXxhash64(longString);
		const fn2 = factoryMd4(longString);

		suite.add({
			name: `xxhash64 ${subName1}`,
			collectBy: subName1,
			onStart: factoryOnStart(fn1, fn2),
			fn: fn1
		});

		suite.add({
			name: `md4 ${subName1}`,
			collectBy: subName1,
			onStart: factoryOnStart(fn1, fn2),
			fn: fn2
		});

		const bufferSize = size * 2;
		const buffer = crypto.randomBytes(bufferSize);
		const subName2 = `buffer benchmark (size: ${bufferSize})`;

		const fn3 = factoryXxhash64(buffer);
		const fn4 = factoryMd4(buffer);

		suite.add({
			name: `xxhash64 ${subName2}`,
			collectBy: subName2,
			onStart: factoryOnStart(fn3, fn4),
			fn: fn3
		});

		suite.add({
			name: `md4 ${subName2}`,
			collectBy: subName2,
			onStart: factoryOnStart(fn3, fn4),
			fn: fn4
		});
	}
}
