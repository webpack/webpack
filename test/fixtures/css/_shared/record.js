"use strict";

// What the CSS fixtures' `fixture.js` files share: big inputs, a check that
// writes a long print short, and visitors and functions whose every call and
// path read lands in the snapshot, so a test reading them needs no code.

/**
 * @param {number} count how many rules
 * @param {(i: number) => string} rule the rule at an index
 * @returns {string} the rules one after another
 */
const repeat = (count, rule) => {
	let out = "";
	for (let i = 0; i < count; i++) out += rule(i);
	return out;
};

/**
 * @param {string} text a print
 * @param {Record<string, string>} pieces long runs of it, by name
 * @returns {string} the print with each run written as `${NAME}`, longest first
 */
const abbreviate = (text, pieces) => {
	const names = Object.keys(pieces).sort(
		(a, b) => pieces[b].length - pieces[a].length
	);
	let out = text;
	for (const name of names) out = out.split(pieces[name]).join(`\${${name}}`);
	return out;
};

/**
 * @param {Record<string, string>} pieces long runs a print holds, by name
 * @returns {(result: { code: string }) => { code: string }} a check writing the print with each run as its name
 */
const shortCode = (pieces) => (result) => ({
	code: abbreviate(result.code, pieces)
});

/** Path reads whose answer is a node, or a list of them. */
const NODE_READS = new Set(["child", "field", "fieldNamed", "node", "parent"]);
/** Path reads that are properties rather than methods. */
const PROPERTIES = new Set(["node", "parent", "index"]);
/** How many arguments before a read's node are an index, a member or a name. */
const LEADING = new Map([
	["flag", 1],
	["fieldCount", 1],
	["rangeOf", 1],
	["startOf", 1],
	["endOf", 1],
	["textOf", 1],
	["child", 1],
	["field", 2],
	["fieldNamed", 2]
]);

/**
 * Visitors whose calls, and each read a call makes through its path or `A`,
 * are written to the log as one JSON line per call; a run of equal lines is
 * one line ending in its count. The first line names the visitors.
 * @param {(enums: EXPECTED_ANY) => Record<number, EXPECTED_ANY>} make the visitor map, given the enums with the `A` its reads go through
 * @returns {(log: string[], enums: EXPECTED_ANY) => Record<number, EXPECTED_ANY>} the `visit` factory
 */
const recordVisitors = (make) => (log, enums) => {
	/** @type {Map<number, number>} */
	const handles = new Map();
	/** @type {unknown[][] | undefined} */
	let reads;
	let last = "";
	let repeats = 0;
	/**
	 * @param {unknown} node a node
	 * @returns {unknown} it as the log writes it
	 */
	const handle = (node) => {
		if (node === 0 || node === null || typeof node !== "number") return node;
		if (!handles.has(node)) handles.set(node, handles.size + 1);
		return { "@": handles.get(node) };
	};
	/**
	 * @param {string} name the read
	 * @param {unknown} value its answer
	 * @returns {unknown} the answer as the log writes it
	 */
	const answer = (name, value) => {
		name = name.replace(/^\.|^A\./, "");
		if (name === "children") return /** @type {unknown[]} */ (value).map(handle);
		return NODE_READS.has(name) ? handle(value) : value;
	};
	/**
	 * @param {string} name the read
	 * @param {unknown[]} args its arguments
	 * @param {unknown} value its answer
	 * @returns {unknown} the answer
	 */
	const note = (name, args, value) => {
		const read = name.startsWith("A.") ? name.slice(2) : name;
		const leading = LEADING.get(read) || 0;
		// `source(start, end)` reads a range of the input, not a node.
		const nodes = read === "source" && args.length === 2 ? args.length : leading;
		const entry = [
			name,
			args.map((arg, i) => (i < nodes ? arg : handle(arg)))
		];
		if (value !== undefined) entry.push(answer(name, value));
		if (reads !== undefined) reads.push(entry);
		return value;
	};
	/**
	 * @param {string} line a call's line
	 * @returns {void}
	 */
	const write = (line) => {
		if (line === last) {
			repeats++;
			log[log.length - 1] = `${line} x${repeats}`;
			return;
		}
		last = line;
		repeats = 1;
		log.push(line);
	};
	/** @type {Record<string, (...args: EXPECTED_ANY[]) => unknown>} */
	const A = {};
	const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(enums.A));
	for (const name of [...methods, ...Object.keys(enums.A)]) {
		if (name === "constructor" || typeof enums.A[name] !== "function") continue;
		A[name] = (...args) =>
			note(`A.${name}`, args, enums.A[name](...args));
	}
	/**
	 * @param {EXPECTED_ANY} path the path the walk hands a visitor
	 * @returns {EXPECTED_ANY} it, writing each read to the call's line
	 */
	const recording = (path) =>
		new Proxy(path, {
			get: (target, key) => {
				const name = String(key);
				if (PROPERTIES.has(name)) return note(`.${name}`, [], target[name]);
				const value = target[name];
				if (typeof value !== "function") return value;
				return (...args) => note(name, args, value.apply(target, args));
			}
		});
	/** @type {Record<number, string>} */
	const typeNames = {};
	for (const name of Object.keys(enums.NodeType)) {
		typeNames[enums.NodeType[name]] = name;
	}
	/**
	 * @param {string} call `Type` or `/Type`
	 * @param {(path: EXPECTED_ANY) => unknown} visitor the visitor
	 * @returns {(path: EXPECTED_ANY) => unknown} it, writing its call's line
	 */
	const wrap = (call, visitor) => (path) => {
		// Nodes are numbered per call, so equal calls write equal lines.
		handles.clear();
		reads = [];
		const line = [call];
		try {
			return visitor(recording(path));
		} finally {
			write(JSON.stringify([...line, ...reads]));
			reads = undefined;
		}
	};
	const map = make({ ...enums, A });
	/** @type {Record<number, EXPECTED_ANY>} */
	const out = {};
	/** @type {string[]} */
	const names = [];
	for (const key of Object.keys(map)) {
		const type = typeNames[Number(key)];
		const visitor = map[Number(key)];
		if (typeof visitor === "function") {
			out[Number(key)] = wrap(type, visitor);
			names.push(type);
			continue;
		}
		/** @type {Record<string, (path: EXPECTED_ANY) => unknown>} */
		const pair = {};
		if (visitor.enter) {
			pair.enter = wrap(type, visitor.enter);
			names.push(type);
		}
		if (visitor.exit) {
			pair.exit = wrap(`/${type}`, visitor.exit);
			names.push(`/${type}`);
		}
		out[Number(key)] = pair;
	}
	log.push(JSON.stringify(["visitors", ...names.sort()]));
	return out;
};

/**
 * A function whose calls are kept, each as its arguments and its answer, for
 * a `check` to read back with `callsOf`.
 * @template {(...args: EXPECTED_ANY[]) => unknown} T
 * @param {T} fn the function
 * @returns {T & { calls: unknown[][] }} it, keeping its calls
 */
const recordFunction = (fn) => {
	/** @type {unknown[][]} */
	const calls = [];
	const recorded = /** @type {T & { calls: unknown[][] }} */ (
		/** @type {unknown} */ (
			(...args) => {
				const value = fn(...args);
				calls.push(value === undefined ? [args] : [args, value]);
				return value;
			}
		)
	);
	recorded.calls = calls;
	return recorded;
};

/**
 * @param {Record<string, { calls: unknown[][] }>} recorded functions `recordFunction` made, by name
 * @param {(result: EXPECTED_ANY) => Record<string, unknown>=} more what else the check reports
 * @returns {(result: EXPECTED_ANY) => Record<string, unknown>} a check reporting, and forgetting, each one's calls
 */
const callsOf = (recorded, more) => (result) => {
	/** @type {Record<string, unknown>} */
	const out = more === undefined ? {} : more(result);
	for (const name of Object.keys(recorded)) {
		out[name] = recorded[name].calls.splice(0);
	}
	return out;
};

module.exports = {
	abbreviate,
	callsOf,
	recordFunction,
	recordVisitors,
	repeat,
	shortCode
};
