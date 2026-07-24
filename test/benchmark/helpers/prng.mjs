/**
 * Deterministic PRNG (mulberry32). Benchmarks must never use Math.random():
 * fixture content has to be byte-identical on every run and machine.
 * @param {number} seed 32-bit seed
 * @returns {() => number} generator of floats in [0, 1)
 */
export function mulberry32(seed) {
	let state = seed | 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * @param {() => number} random generator from mulberry32
 * @param {number} min inclusive lower bound
 * @param {number} max exclusive upper bound
 * @returns {number} integer in [min, max)
 */
export function randomInt(random, min, max) {
	return min + Math.floor(random() * (max - min));
}

/**
 * @param {number} seed 32-bit seed
 * @param {number} size number of bytes
 * @returns {Buffer} deterministic pseudo-random bytes
 */
export function deterministicBytes(seed, size) {
	const random = mulberry32(seed);
	const buffer = Buffer.allocUnsafe(size);
	for (let i = 0; i < size; i++) {
		buffer[i] = randomInt(random, 0, 256);
	}
	return buffer;
}
