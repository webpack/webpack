import fs from "fs";

/** @typedef {(...args: unknown[]) => unknown} FsMethod */
/** @typedef {(...results: unknown[]) => void} FsCallback */

// Callback methods whose `*Sync` twin returns only the byte count; the callback
// also receives the buffer the caller passed in.
const RETURNS_BUFFER = new Set(["read", "write", "readv", "writev"]);

/**
 * Spell out the buffer `fs.read(fd[, options], callback)` leaves implicit, as
 * `fs.readSync` has no form without one.
 * @param {unknown[]} args `read` arguments without the callback
 * @returns {unknown[]} arguments with an explicit buffer, offset, length and position
 */
const withReadBuffer = (args) => {
	if (ArrayBuffer.isView(args[1])) return args;
	const options =
		/** @type {{ buffer?: NodeJS.ArrayBufferView, offset?: number, length?: number, position?: number | bigint | null }} */ (
			args[1] || {}
		);
	const buffer = options.buffer || Buffer.alloc(16384);
	const offset = options.offset || 0;
	return [
		args[0],
		buffer,
		offset,
		options.length ?? buffer.byteLength - offset,
		options.position ?? null
	];
};

/**
 * Run `syncMethod` now and hand its outcome to `callback` on the next tick.
 * @param {FsMethod} syncMethod synchronous twin of the called method
 * @param {unknown[]} args arguments without the callback
 * @param {FsCallback} callback caller's callback
 * @param {(value: unknown) => unknown[]} toResults callback arguments for a success
 * @returns {void}
 */
const callBackInOrder = (syncMethod, args, callback, toResults) => {
	/** @type {unknown[]} */
	let results;
	try {
		results = toResults(syncMethod(...args));
	} catch (err) {
		results = [err];
	}
	process.nextTick(() => callback(...results));
};

/**
 * Wrap `fs` so every callback method runs its `*Sync` twin and calls back on
 * the next tick, in the order the calls were made. Async I/O completes in a
 * different order on every run, so the same build allocates in a different
 * interleaving and V8's garbage collector runs at different points.
 * @returns {typeof fs} file system with deterministic callback order
 */
export default function createSequentialFileSystem() {
	const source = /** @type {Record<string, unknown>} */ (
		/** @type {unknown} */ (fs)
	);
	/** @type {Record<string, unknown>} */
	const sequential = {};

	for (const name of Object.keys(source)) {
		const method = source[name];
		const syncMethod = source[`${name}Sync`];

		if (
			typeof method !== "function" ||
			typeof syncMethod !== "function" ||
			name.endsWith("Sync")
		) {
			sequential[name] =
				typeof method === "function" ? method.bind(fs) : method;
			continue;
		}

		sequential[name] = (/** @type {unknown[]} */ ...rawArgs) => {
			const callback = rawArgs.pop();
			if (typeof callback !== "function") {
				return /** @type {FsMethod} */ (syncMethod)(...rawArgs, callback);
			}
			const args = name === "read" ? withReadBuffer(rawArgs) : rawArgs;
			callBackInOrder(
				/** @type {FsMethod} */ (syncMethod),
				args,
				/** @type {FsCallback} */ (callback),
				name === "exists"
					? (value) => [value]
					: RETURNS_BUFFER.has(name)
						? (value) => [null, value, args[1]]
						: (value) => [null, value]
			);
		};
	}

	/** @type {{ native?: FsMethod }} */
	(sequential.realpath).native = (...args) => {
		const callback = /** @type {FsCallback} */ (args.pop());
		callBackInOrder(
			/** @type {FsMethod} */ (fs.realpathSync.native),
			args,
			callback,
			(value) => [null, value]
		);
	};

	return /** @type {typeof fs} */ (/** @type {unknown} */ (sequential));
}
