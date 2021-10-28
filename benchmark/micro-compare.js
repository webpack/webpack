let result;

const measure = (fn, count) => {
	const start = process.hrtime.bigint();
	for (let i = 0; i < count; i++) result = fn();
	return Number(process.hrtime.bigint() - start);
};

const NS_PER_MS = 1000000; // 1ms
const MIN_DURATION = 100 * NS_PER_MS; // 100ms
const MAX_DURATION = 1000 * NS_PER_MS; // 1000ms
const MAX_WARMUP_DURATION = 1 * NS_PER_MS; // 1ms

const format = (fast, slow, fastName, slowName, count) => {
	return `${fastName} is ${
		Math.round(((slow - fast) * 1000) / slow) / 10
	}% faster than ${slowName} (${Math.round(fast / 100 / count) / 10} µs vs ${
		Math.round(slow / 100 / count) / 10
	} µs, ${count}x)`;
};

const compare = (n1, f1, n2, f2) => {
	let count = 1;
	while (true) {
		const timings = [f1, f2, f1, f2, f1, f2].map(f => measure(f, count));
		const t1 = Math.min(timings[0], timings[2], timings[4]);
		const t2 = Math.min(timings[1], timings[3], timings[5]);
		if (count === 1 && (t1 > MAX_WARMUP_DURATION || t2 > MAX_WARMUP_DURATION)) {
			continue;
		}
		if (
			(t1 > MIN_DURATION && t2 > MIN_DURATION) ||
			t1 > MAX_DURATION ||
			t2 > MAX_DURATION
		) {
			return t1 > t2
				? format(t2, t1, n2, n1, count)
				: format(t1, t2, n1, n2, count);
		}
		count *= 2;
	}
};

module.exports = compare;
