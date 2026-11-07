/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const v8 = require("v8");
const { toError: toWebpackError } = require("../errors/ErrorHelpers");

/**
 * A job in one direction. `id` is echoed by the response.
 * @typedef {object} JobMessage
 * @property {"job"} type message type
 * @property {number} id echoed by the response
 * @property {string} module absolute path of the module
 * @property {string} method name of the export to call
 * @property {unknown[]} args arguments
 * @property {boolean} rpc whether the child passes an RPC context
 */

/**
 * @typedef {object} DataResponseMessage
 * @property {"response"} type message type
 * @property {number} id id of the call answered
 * @property {true} ok the call returned
 * @property {unknown} value what it returned
 */

/**
 * @typedef {object} ErrorResponseMessage
 * @property {"response"} type message type
 * @property {number} id id of the call answered
 * @property {false} ok the call threw
 * @property {EncodedError} error what it threw
 */

/** @typedef {DataResponseMessage | ErrorResponseMessage} ResponseMessage */

/**
 * A call from a loader job to the main thread.
 * @typedef {object} RpcMessage
 * @property {"rpc"} type message type
 * @property {number} jobId the job that made the call
 * @property {number=} callId echoed by the result; absent when no result is awaited
 * @property {string} method handler name
 * @property {unknown[]} args arguments
 */

/**
 * @typedef {object} DataRpcResultMessage
 * @property {"rpc-result"} type message type
 * @property {number} jobId the job that made the call
 * @property {number} callId id of the call answered
 * @property {true} ok the handler returned
 * @property {unknown} value what it returned
 */

/**
 * @typedef {object} ErrorRpcResultMessage
 * @property {"rpc-result"} type message type
 * @property {number} jobId the job that made the call
 * @property {number} callId id of the call answered
 * @property {false} ok the handler threw
 * @property {EncodedError} error what it threw
 */

/** @typedef {DataRpcResultMessage | ErrorRpcResultMessage} RpcResultMessage */

/**
 * @typedef {object} PreloadMessage
 * @property {"preload"} type message type
 * @property {number} id echoed by the acknowledgement
 * @property {string[]} modules absolute paths of modules to load
 */

/**
 * @typedef {object} PreloadedMessage
 * @property {"preloaded"} type message type
 * @property {number} id id of the preload answered
 * @property {boolean} ok every module loaded
 * @property {EncodedError=} error what failed
 */

/**
 * @typedef {object} CloseMessage
 * @property {"close"} type message type
 */

/** @typedef {PreloadMessage | JobMessage | CloseMessage | RpcResultMessage} MainToWorkerMessage */
/** @typedef {PreloadedMessage | ResponseMessage | RpcMessage} WorkerToMainMessage */

/**
 * An error in transit.
 * @typedef {object} EncodedError
 * @property {string} name error name
 * @property {string} message error message
 * @property {string=} stack stack trace
 * @property {Record<string, unknown>=} fields own enumerable properties
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
	typeof (/** @type {{ message?: unknown }} */ (value).message) === "string";

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
		return { name: "Error", message: String(error) };
	}
	// A duck-typed object may carry a message without an `Error` name.
	const name = typeof error.name === "string" ? error.name : "Error";
	/** @type {Record<string, unknown>} */
	const fields = {};
	const own = /** @type {Record<string, unknown>} */ (
		/** @type {unknown} */ (error)
	);
	for (const key of Object.keys(error)) {
		fields[key] = own[key];
	}
	try {
		v8.serialize(fields);
	} catch (_err) {
		/** @type {Record<string, unknown>} */
		const cloneable = {};
		for (const key of Object.keys(fields)) {
			try {
				v8.serialize(fields[key]);
				cloneable[key] = fields[key];
			} catch (_fieldError) {
				// Drop only the field that cannot cross the port.
			}
		}
		return {
			name,
			message: error.message,
			stack: error.stack,
			...(Object.keys(cloneable).length > 0 ? { fields: cloneable } : {})
		};
	}
	return {
		name,
		message: error.message,
		stack: error.stack,
		fields
	};
};

/**
 * @param {EncodedError} encoded the wire form
 * @returns {Error} an error carrying the original's name, message, stack and own fields
 */
const decodeError = (encoded) => {
	const error = new Error(encoded.message);
	if (encoded.name !== undefined) error.name = encoded.name;
	if (encoded.stack !== undefined) error.stack = encoded.stack;
	if (encoded.fields !== undefined) Object.assign(error, encoded.fields);
	return error;
};

module.exports.WORKER_DATA_KIND = WORKER_DATA_KIND;
module.exports.decodeError = decodeError;
module.exports.encodeError = encodeError;
module.exports.toError = toError;
