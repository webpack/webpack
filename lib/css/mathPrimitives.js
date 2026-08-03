/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// The arithmetic behind CSS math functions, and nothing about CSS beyond the
// shape of an evaluated argument. Which of these a given function uses is not
// decided here: `lib/css/data.js` binds each one to the functions that select
// it, and `lib/css/syntax.js` only drives the binding. So this file names no
// math function, and adding one never edits it unless the arithmetic is new.
//
// Every operation answers a number or `null`, and `null` leaves the call
// written out. That is the discipline the whole fold rests on: a folded
// expression is no longer there for the engine to recompute, so a result that
// carries any rounding of its own must be declined rather than printed.

/**
 * Add two doubles, or decline when the sum carries rounding of its own.
 * @param {number} a one term
 * @param {number} b the other
 * @returns {number | null} their exact sum, or `null`
 */
const exactAdd = (a, b) => {
	const sum = a + b;
	return sum - b === a && sum - a === b ? sum : null;
};

/**
 * Multiply, or decline, on the same terms.
 * @param {number} a the value
 * @param {number} k the factor
 * @returns {number | null} their exact product, or `null`
 */
const exactMultiply = (a, k) => {
	const product = a * k;
	if (!Number.isFinite(product)) return null;
	if (a === 0 || k === 0) return product;
	return product / k === a ? product : null;
};

/**
 * Divide, or decline, on the same terms.
 * @param {number} a the value
 * @param {number} k the divisor
 * @returns {number | null} their exact quotient, or `null`
 */
const exactDivide = (a, k) => {
	if (k === 0) return null;
	const quotient = a / k;
	if (!Number.isFinite(quotient)) return null;
	return quotient * k === a ? quotient : null;
};

/**
 * `floor(value / step)` for a positive step, checked against the step exactly.
 * The double quotient can land an ulp either side of an integer, which would put
 * the multiple a whole step out, so the candidate is verified by multiplying
 * back and nudged at most once either way.
 * @param {number} value the dividend
 * @param {number} step the divisor, greater than zero
 * @returns {number | null} the floor, or `null` when it cannot be pinned down
 */
const exactFloorDivide = (value, step) => {
	let n = Math.floor(value / step);
	if (!Number.isFinite(n)) return null;
	for (let attempt = 0; attempt < 3; attempt++) {
		const at = exactMultiply(n, step);
		const next = exactMultiply(n + 1, step);
		if (at === null || next === null) return null;
		if (at > value) {
			n--;
			continue;
		}
		if (next <= value) {
			n++;
			continue;
		}
		return n;
	}
	return null;
};

/**
 * The square root of a value, where it is one that can be written down. IEEE-754
 * makes `Math.sqrt` correctly rounded, so squaring the result back is a complete
 * test — and it fails for every irrational root, which is most of them.
 * @param {number} value the radicand
 * @returns {number | null} the root, or `null`
 */
const exactSquareRoot = (value) => {
	if (!(value >= 0)) return null;
	const root = Math.sqrt(value);
	const back = exactMultiply(root, root);
	return back === null || back !== value ? null : root;
};

// Beyond this an integer exponent is not worth multiplying out, and every result
// overflows a double for all but a base within an ulp of 1.
const POWER_LIMIT = 64;

/**
 * `base ** exponent` for a whole exponent, by multiplying out. Every step is
 * checked, so the result is the one an engine computing in doubles gets — which
 * `Math.pow` is not required to be for a general exponent.
 * @param {number} base the base
 * @param {number} exponent a whole exponent
 * @returns {number | null} the power, or `null`
 */
const exactIntegerPower = (base, exponent) => {
	if (!Number.isInteger(exponent) || Math.abs(exponent) > POWER_LIMIT) {
		return null;
	}
	let power = 1;
	for (let n = Math.abs(exponent); n > 0; n--) {
		const next = exactMultiply(power, base);
		if (next === null) return null;
		power = next;
	}
	return exponent < 0 ? exactDivide(1, power) : power;
};

/**
 * One evaluated argument list, read as a shared unit and its coefficients. A
 * percentage is refused: its basis can be negative (a `background-position`
 * against an image wider than its box), and comparing two of them depends on
 * that sign in a way `calc()`'s arithmetic does not — scaling a percentage is
 * linear, picking the smaller of two is not.
 * @param {Map<string, number>[]} sums the evaluated arguments
 * @returns {[string, number[]] | null} the shared unit and the coefficients
 */
const readSameUnit = (sums) => {
	/** @type {string | null} */
	let shared = null;
	/** @type {number[]} */
	const values = [];
	for (const sum of sums) {
		if (sum.size !== 1) return null;
		const [[key, coefficient]] = sum;
		if (key === "%") return null;
		if (shared === null) shared = key;
		else if (shared !== key) return null;
		values.push(coefficient);
	}
	return shared === null ? null : [shared, values];
};

/**
 * The same, narrowed to arguments that reduced to a plain `<number>`.
 * @param {Map<string, number>[]} sums the evaluated arguments
 * @returns {[string, number[]] | null} the unit (always `""`) and the numbers
 */
const readNumber = (sums) => {
	const shared = readSameUnit(sums);
	return shared === null || shared[0] !== "" ? null : shared;
};

/**
 * A reader answering which eighth turn a single angle argument is, as the one
 * "coefficient" — a lookup key rather than a magnitude, which `lookup` takes. A
 * plain number is an angle in radians, where only zero lands on a whole one.
 * @param {Map<string, number>} quarterTurnAngle a quarter turn in each unit that spells one exactly
 * @returns {(sums: Map<string, number>[]) => [string, number[]] | null} the reader
 */
const eighthTurnReader = (quarterTurnAngle) => (sums) => {
	const shared = readSameUnit(sums);
	if (shared === null) return null;
	const [unit, [angle]] = shared;
	if (unit === "") return angle === 0 ? ["", [0]] : null;
	const quarter = quarterTurnAngle.get(unit);
	if (quarter === undefined) return null;
	// Halving a quarter turn is exact in each unit that spells one: 45, 50 and an
	// eighth, which is a power of two.
	const eighths = exactDivide(angle, quarter / 2);
	if (eighths === null || !Number.isInteger(eighths)) return null;
	return ["", [((eighths % 8) + 8) % 8]];
};

/**
 * @param {number[]} values the coefficients
 * @returns {number} the smallest
 */
const minimum = (values) => Math.min(...values);

/**
 * @param {number[]} values the coefficients
 * @returns {number} the largest
 */
const maximum = (values) => Math.max(...values);

/**
 * CSS Values 4 §10.4: the lower bound wins a contradictory pair.
 * @param {number[]} values the lower bound, the value and the upper bound
 * @returns {number} the value held between them
 */
const clamp = ([lower, value, upper]) =>
	Math.max(lower, Math.min(value, upper));

/**
 * @param {number[]} values the one coefficient
 * @returns {number} its magnitude
 */
const absolute = ([value]) => Math.abs(value);

/**
 * The one operation whose answer changes unit: a sign is a `<number>`. Every
 * unit reaching here scales by a positive factor, so the coefficient's sign is
 * the value's even where the factor is not known.
 * @param {number[]} values the one coefficient
 * @returns {number} its sign
 */
const sign = ([value]) => Math.sign(value);

/**
 * @param {number[]} values the coefficients
 * @returns {number | null} the root of their sum of squares, or `null`
 */
const hypotenuse = (values) => {
	let total = 0;
	for (const value of values) {
		const square = exactMultiply(value, value);
		if (square === null) return null;
		const sum = exactAdd(total, square);
		if (sum === null) return null;
		total = sum;
	}
	return exactSquareRoot(total);
};

/**
 * The multiple of `step` that `strategy` rounds `value` to, as CSS Values 4
 * §10.6 defines them and headless Chromium confirms: `nearest` breaks a tie
 * toward positive infinity, and the other three are the ceiling, the floor and
 * the truncation. A step of zero is NaN per the spec and engines do not agree
 * on what that renders as; a negative one is left alone rather than reasoned
 * about.
 * @param {number[]} values the value and the step
 * @param {string} strategy one of the grammar's rounding strategies
 * @returns {number | null} the rounded multiple, or `null`
 */
const round = ([value, step], strategy) => {
	if (!(step > 0)) return null;
	const below = exactFloorDivide(value, step);
	if (below === null) return null;
	const at = /** @type {number} */ (exactMultiply(below, step));
	// Exactly on a step is where engines stop agreeing: these are step functions,
	// so an ulp of error in the engine's own conversion moves the answer a whole
	// step. Headless Chromium reads `round(down,10cm,2cm)` as `8cm` and
	// `round(down,-7cm,.5cm)` as `-7.5cm`. Away from a boundary the gap is orders
	// of magnitude wider than any such error, so only the boundary is refused.
	if (at === value) return null;
	let multiple;
	if (strategy === "down") {
		multiple = below;
	} else if (strategy === "up") {
		multiple = below + 1;
	} else if (strategy === "to-zero") {
		multiple = value < 0 ? below + 1 : below;
	} else {
		// The remainder is in `[0, step)`, so twice it against the step is the
		// comparison, and an exact half rounds up — toward positive infinity.
		const remainder = exactAdd(value, -at);
		if (remainder === null) return null;
		const doubled = exactMultiply(remainder, 2);
		if (doubled === null) return null;
		multiple = doubled >= step ? below + 1 : below;
	}
	return exactMultiply(multiple, step);
};

/**
 * The remainder carrying the divisor's sign.
 * @param {number[]} values the dividend and the divisor
 * @returns {number | null} the remainder, or `null`
 */
const modulus = ([value, divisor]) => {
	if (divisor === 0) return null;
	const remainder = value % divisor;
	// A zero remainder is the boundary these two share with `round()`, and engines
	// do not agree on it: headless Chromium reads `mod(10px,-2px)` and
	// `mod(-9px,3px)` as the divisor where both are zero.
	if (remainder === 0) return null;
	// A remainder on the other side of zero is brought back across it.
	return remainder < 0 === divisor < 0
		? remainder
		: exactAdd(remainder, divisor);
};

/**
 * The remainder carrying the dividend's sign, which is what `%` already does.
 * @param {number[]} values the dividend and the divisor
 * @returns {number | null} the remainder, or `null`
 */
const remainder = ([value, divisor]) => {
	if (divisor === 0) return null;
	// The same zero boundary `modulus` declines.
	const rest = value % divisor;
	return rest === 0 ? null : rest;
};

/**
 * @param {number[]} values the one radicand
 * @returns {number | null} its root, or `null`
 */
const squareRoot = ([value]) => exactSquareRoot(value);

/**
 * @param {number[]} values the base and the exponent
 * @returns {number | null} the power, or `null`
 */
const power = ([base, exponent]) => exactIntegerPower(base, exponent);

/**
 * A logarithm is transcendental except where it lands on a whole power of its
 * base, so the candidate is raised back and only an exact match is taken. The
 * natural logarithm's base is not a double at all, which leaves only `log(1)`.
 * @param {number[]} values the value and, optionally, the base
 * @returns {number | null} the logarithm, or `null`
 */
const logarithm = ([value, base]) => {
	if (base === undefined) return value === 1 ? 0 : null;
	const exponent = Math.round(Math.log(value) / Math.log(base));
	const back = exactIntegerPower(base, exponent);
	return back === null || back !== value ? null : exponent;
};

/**
 * `e` is not a double, so every other power of it is a number this cannot write
 * down and an engine's math library rounds its own way.
 * @param {number[]} values the one exponent
 * @returns {number | null} the power of `e`, or `null`
 */
const exponential = ([value]) => (value === 0 ? 1 : null);

/**
 * Read the answer out of the table the descriptor carries. Absent means the
 * value is one no stylesheet can hold, so the call stays written out.
 * @param {number[]} values the one lookup key
 * @param {string} _strategy unused
 * @param {Map<number, number> | null} table the descriptor's table
 * @returns {number | null} the answer, or `null`
 */
const lookup = ([key], _strategy, table) => {
	const value = /** @type {Map<number, number>} */ (table).get(key);
	return value === undefined ? null : value;
};

/**
 * The eight directions the arc tangent of a ratio is a whole number of degrees
 * in, an eighth turn apart. Both zero is refused: the spec leaves it to the
 * engine.
 * @param {number[]} values the two coordinates
 * @returns {number | null} the angle in degrees, or `null`
 */
const arcTangent2 = ([y, x]) => {
	if (y === 0 && x === 0) return null;
	if (y === 0) return x > 0 ? 0 : 180;
	if (x === 0) return y > 0 ? 90 : -90;
	if (Math.abs(y) !== Math.abs(x)) return null;
	if (x > 0) return y > 0 ? 45 : -45;
	return y > 0 ? 135 : -135;
};

module.exports.absolute = absolute;
module.exports.arcTangent2 = arcTangent2;
module.exports.clamp = clamp;
module.exports.eighthTurnReader = eighthTurnReader;
module.exports.exactAdd = exactAdd;
module.exports.exactDivide = exactDivide;
module.exports.exactMultiply = exactMultiply;
module.exports.exponential = exponential;
module.exports.hypotenuse = hypotenuse;
module.exports.logarithm = logarithm;
module.exports.lookup = lookup;
module.exports.maximum = maximum;
module.exports.minimum = minimum;
module.exports.modulus = modulus;
module.exports.power = power;
module.exports.readNumber = readNumber;
module.exports.readSameUnit = readSameUnit;
module.exports.remainder = remainder;
module.exports.round = round;
module.exports.sign = sign;
module.exports.squareRoot = squareRoot;
