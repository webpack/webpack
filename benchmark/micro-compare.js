 let result;

const measure = (fn, count) => {
	const start = process.hrtime.bigint();
	for (let i = 0; i < count; i++) result = fn();
	return Number(process.hrtime.bigint() - start);
};

const NS_PER_MS = 1_000_000; // Nanoseconds in one millisecond
const MIN_DURATION = 100 * NS_PER_MS; // 100ms
const MAX_DURATION = 1_000 * NS_PER_MS; // 1000ms
const MAX_WARMUP_DURATION = 10 * NS_PER_MS; // 10ms

const formatResult = (fasterTime, slowerTime, fasterName, slowerName, count) => {
	const percentage = Math.round(((slowerTime - fasterTime) * 1000) / slowerTime) / 10;
	const fasterAvg = Math.round(fasterTime / count / 100) / 10;
	const slowerAvg = Math.round(slowerTime / count / 100) / 10;

	return `${fasterName} is ${percentage}% faster than ${slowerName} ` +
		`(${fasterAvg} µs vs ${slowerAvg} µs, ${count} iterations)`;
};

const compare = (name1, fn1, name2, fn2) => {
	let count = 1;

	while (true) {
		// Measure performance of both functions in interleaved order
		const timings = [fn1, fn2, fn1, fn2, fn1, fn2].map(fn => measure(fn, count));

		// Take the best of three runs to minimize interference
		const time1 = Math.min(timings[0], timings[2], timings[4]);
		const time2 = Math.min(timings[1], timings[3], timings[5]);

		// Skip first iteration if it takes too long (warm-up stage)
		if (count === 1 && (time1 > MAX_WARMUP_DURATION || time2 > MAX_WARMUP_DURATION)) {
			continue;
		}

		// Stop benchmarking once we hit stable timing thresholds
		if (
			(time1 > MIN_DURATION && time2 > MIN_DURATION) ||
			time1 > MAX_DURATION ||
			time2 > MAX_DURATION
		) {
			// Return the formatted comparison result
			return time1 > time2
				? formatResult(time2, time1, name2, name1, count)
				: formatResult(time1, time2, name1, name2, count);
		}

		// Double the iteration count to improve timing precision
		count *= 2;

		// Safeguard against infinite loops (e.g., bad inputs or extremely slow functions)
		if (count > 1e9) {
			throw new Error("Benchmark exceeded safe iteration limits. Review inputs.");
		}
	}
};

module.exports = compare;
