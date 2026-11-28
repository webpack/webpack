/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const v8 = require("v8");
const { toError: toWebpackError } = require("../errors/ErrorHelpers");

/**
 * What crosses a thread by structured clone: no functions, symbols or class prototypes. `Map` and `Set` clone too; the type leaves them out to stay a plain recursive alias.
 * @typedef {null | undefined | boolean | number | bigint | string | Date | RegExp | ArrayBuffer | ArrayBufferView | Error | CloneableArray | CloneableObject} CloneableValue
 */
/** @typedef {CloneableValue[]} CloneableArray */
/** @typedef {{ [Key in string]?: CloneableValue }} CloneableObject */

/**
 * What a job's export receives first when the job may call the main thread.
 * @typedef {object} RpcContext
 * @property {number} workerId id the pool gave this thread; `0` inline
 * @property {(method: string, args: CloneableValue[]) => Promise<CloneableValue>} callMain calls a main-thread handler and waits
 * @property {(method: string, args: CloneableValue[]) => void} callMainNoWait calls a main-thread handler without waiting
 */

/**
 * An export the pool calls: an RPC job receives its `RpcContext` before the arguments.
 * @typedef {(...args: (CloneableValue | RpcContext)[]) => CloneableValue | Promise<CloneableValue>} WorkerMethod
 */

/**
 * The exports of a module the pool loads, as the pool reads them.
 * @typedef {Record<string, CloneableValue | WorkerMethod>} WorkerExports
 */

/**
 * Main-to-thread message tags. `1` and `2` reuse jest-worker's call/end tags;
 * `3` and `4` are webpack's preload and RPC-result messages, occupying the
 * numbers jest-worker uses for memory usage and call setup.
 */
const CHILD_MESSAGE_CALL = 1;
const CHILD_MESSAGE_END = 2;
const CHILD_MESSAGE_PRELOAD = 3;
const CHILD_MESSAGE_RPC_RESULT = 4;

/**
 * Thread-to-main message tags. `0` and `1` reuse jest-worker's success/error
 * tags; `2` and `3` are webpack's preload result and RPC request, occupying
 * the numbers jest-worker uses for setup errors and custom messages.
 */
const PARENT_MESSAGE_OK = 0;
const PARENT_MESSAGE_CLIENT_ERROR = 1;
const PARENT_MESSAGE_PRELOADED = 2;
const PARENT_MESSAGE_RPC = 3;

/**
 * A job in one direction. Unlike jest-worker, the id follows the tag because
 * one thread may carry several calls, and there is no `isProcessed` slot: the
 * queue lives only in the pool.
 * @typedef {[type: typeof CHILD_MESSAGE_CALL, id: number, module: string, method: string, args: CloneableValue[], rpc: boolean]} JobMessage
 */

/**
 * @typedef {[type: typeof PARENT_MESSAGE_OK, id: number, value: CloneableValue]} DataResponseMessage
 */

/**
 * @typedef {[type: typeof PARENT_MESSAGE_CLIENT_ERROR, id: number, ...error: EncodedError]} ErrorResponseMessage
 */

/** @typedef {DataResponseMessage | ErrorResponseMessage} ResponseMessage */

/**
 * A call from a loader job to the main thread. `0` means no result is awaited.
 * @typedef {[type: typeof PARENT_MESSAGE_RPC, jobId: number, callId: number, method: string, args: CloneableValue[]]} RpcMessage
 */

/**
 * @typedef {[type: typeof CHILD_MESSAGE_RPC_RESULT, jobId: number, callId: number, ok: true, value: CloneableValue]} DataRpcResultMessage
 */

/**
 * @typedef {[type: typeof CHILD_MESSAGE_RPC_RESULT, jobId: number, callId: number, ok: false, ...error: EncodedError]} ErrorRpcResultMessage
 */

/** @typedef {DataRpcResultMessage | ErrorRpcResultMessage} RpcResultMessage */

/**
 * @typedef {[type: typeof CHILD_MESSAGE_PRELOAD, id: number, modules: string[]]} PreloadMessage
 */

/**
 * @typedef {[type: typeof PARENT_MESSAGE_PRELOADED, id: number, ok: true] | [type: typeof PARENT_MESSAGE_PRELOADED, id: number, ok: false, ...error: EncodedError]} PreloadedMessage
 */

/**
 * @typedef {[type: typeof CHILD_MESSAGE_END]} CloseMessage
 */

/** @typedef {PreloadMessage | JobMessage | CloseMessage | RpcResultMessage} MainToWorkerMessage */
/** @typedef {PreloadedMessage | ResponseMessage | RpcMessage} WorkerToMainMessage */

/**
 * An error in transit, in jest-worker order: constructor name, message, stack
 * and own enumerable fields. Kept as one tuple because webpack messages also
 * carry a call id and the tuple stays explicitly typed.
 * @typedef {[name: string, message: string, stack: string | undefined, fields: Record<string, CloneableValue> | undefined]} EncodedError
 */

/**
 * What a thread is spawned with, so WorkerChild.js starts only in a thread the pool spawned.
 * @typedef {object} WorkerData
 * @property {typeof WORKER_DATA_KIND} kind marks a thread the pool spawned
 * @property {number} workerId id the pool gave this thread
 */

/** What `workerData.kind` holds */
const WORKER_DATA_KIND = /** @type {"webpack/worker-pool"} */ (
	"webpack/worker-pool"
);

/**
 * Tells an error by its shape, since `instanceof Error` misses one from another realm.
 * @param {ThrownValue} value what was thrown
 * @returns {value is Error} whether it carries an error's message
 */
const isError = (value) =>
	typeof value === "object" &&
	value !== null &&
	"message" in value &&
	typeof value.message === "string";

/**
 * DOMException and errors from another realm carry a message but are not `Error` instances.
 * @param {ThrownValue} value what was thrown
 * @returns {Error} the value when it is error-like, else webpack's wrapper
 */
const toError = (value) => (isError(value) ? value : toWebpackError(value));

/**
 * @param {ThrownValue} error what was thrown
 * @returns {EncodedError} its wire form
 */
const encodeError = (error) => {
	if (!isError(error)) {
		return ["Error", String(error), undefined, undefined];
	}
	// Follow jest-worker: the constructor name, not the mutable `name` field.
	const name =
		typeof error.constructor === "function" &&
		typeof error.constructor.name === "string" &&
		error.constructor.name.length > 0
			? error.constructor.name
			: typeof error.name === "string"
				? error.name
				: "Error";
	/** @type {Record<string, CloneableValue>} */
	const fields = {};
	const own = /** @type {Error & Record<string, CloneableValue>} */ (error);
	for (const key of Object.keys(error)) {
		fields[key] = own[key];
	}
	try {
		v8.serialize(fields);
	} catch (_err) {
		/** @type {Record<string, CloneableValue>} */
		const cloneable = {};
		for (const key of Object.keys(fields)) {
			try {
				v8.serialize(fields[key]);
				cloneable[key] = fields[key];
			} catch (_fieldError) {
				// Drop only the field that cannot cross the port.
			}
		}
		return [
			name,
			error.message,
			error.stack,
			Object.keys(cloneable).length > 0 ? cloneable : undefined
		];
	}
	return [
		name,
		error.message,
		error.stack,
		Object.keys(fields).length > 0 ? fields : undefined
	];
};

/**
 * A constructor for `AggregateError`, which takes the errors first, any
 * values a rejection or `throw` handed on, and the message second;
 * `ErrorConstructor` would pass the message into `errors`.
 * @typedef {new (errors: Iterable<ThrownValue>, message?: string) => Error} AggregateErrorConstructor
 */

/**
 * @param {EncodedError} encoded the wire form
 * @returns {Error} an error carrying the original's constructor, message, stack and own fields
 */
const decodeError = (encoded) => {
	const Native = /** @type {Record<string, unknown>} */ (global)[encoded[0]];
	const Ctor =
		typeof Native === "function" &&
		(Native === Error || Native.prototype instanceof Error)
			? /** @type {ErrorConstructor} */ (Native)
			: Error;
	/** @type {Error} */
	let error;
	try {
		error =
			encoded[0] === "AggregateError" && typeof Native === "function"
				? new /** @type {AggregateErrorConstructor} */ (Native)([], encoded[1])
				: new Ctor(encoded[1]);
	} catch (_err) {
		error = new Error(encoded[1]);
	}
	// A non-Error global (or a broken constructor) must not escape the decoder.
	if (!isError(error)) error = new Error(encoded[1]);
	try {
		/** @type {Error & { type?: string }} */ (error).type = encoded[0];
	} catch (_err) {
		// A non-extensible host error keeps its constructor name only.
	}
	try {
		if (encoded[2] !== undefined) error.stack = encoded[2];
	} catch (_err) {
		// DOMException and other host errors may reject a stack write.
	}
	if (encoded[3] !== undefined && encoded[3] !== null) {
		for (const key of Object.keys(encoded[3])) {
			try {
				Object.defineProperty(error, key, {
					value: encoded[3][key],
					writable: true,
					enumerable: true,
					configurable: true
				});
			} catch (_err) {
				// Skip a read-only own field; the error itself still crosses.
			}
		}
	}
	return error;
};

module.exports.CHILD_MESSAGE_CALL = CHILD_MESSAGE_CALL;
module.exports.CHILD_MESSAGE_END = CHILD_MESSAGE_END;
module.exports.CHILD_MESSAGE_PRELOAD = CHILD_MESSAGE_PRELOAD;
module.exports.CHILD_MESSAGE_RPC_RESULT = CHILD_MESSAGE_RPC_RESULT;
module.exports.PARENT_MESSAGE_CLIENT_ERROR = PARENT_MESSAGE_CLIENT_ERROR;
module.exports.PARENT_MESSAGE_OK = PARENT_MESSAGE_OK;
module.exports.PARENT_MESSAGE_PRELOADED = PARENT_MESSAGE_PRELOADED;
module.exports.PARENT_MESSAGE_RPC = PARENT_MESSAGE_RPC;
module.exports.WORKER_DATA_KIND = WORKER_DATA_KIND;
module.exports.decodeError = decodeError;
module.exports.encodeError = encodeError;
module.exports.toError = toError;
