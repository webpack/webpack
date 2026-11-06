/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/**
 * A call in one direction. `id` is echoed by the response.
 * @typedef {object} CallMessage
 * @property {"call"} type message type
 * @property {number} id echoed by the response
 * @property {string} module absolute path of the module
 * @property {string} method name of the export to call
 * @property {unknown[]} args arguments
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
 * @typedef {object} PreloadMessage
 * @property {"preload"} type message type
 * @property {number} id echoed by the acknowledgement
 * @property {string[]} modules absolute paths of modules to load
 */

/**
 * @typedef {object} PreloadedMessage
 * @property {"preloaded"} type message type
 * @property {number} id id of the preload answered
 * @property {true} ok every module loaded
 * @property {EncodedError=} error what failed
 */

/**
 * @typedef {object} CloseMessage
 * @property {"close"} type message type
 */

/** @typedef {PreloadMessage | CallMessage | CloseMessage} MainToWorkerMessage */
/** @typedef {PreloadedMessage | ResponseMessage} WorkerToMainMessage */

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
 * @param {unknown} value what was thrown
 * @returns {value is Error} whether it carries an error's message
 */
const isError = (value) =>
	typeof value === "object" &&
	value !== null &&
	typeof (/** @type {{ message?: unknown }} */ (value).message) === "string";

/**
 * @param {unknown} value what was thrown
 * @returns {Error} the value when it is an error, else an error carrying its string form
 */
const toError = (value) => (isError(value) ? value : new Error(String(value)));

/**
 * @param {unknown} error what was thrown
 * @returns {EncodedError} its wire form
 */
const encodeError = (error) => {
	if (!isError(error)) {
		return { name: "Error", message: String(error) };
	}
	/** @type {Record<string, unknown>} */
	const fields = {};
	for (const key of Object.keys(error)) {
		fields[key] = /** @type {Record<string, unknown>} */ (error)[key];
	}
	return {
		name: error.name,
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
	error.name = encoded.name;
	if (encoded.stack !== undefined) error.stack = encoded.stack;
	if (encoded.fields !== undefined) Object.assign(error, encoded.fields);
	return error;
};

module.exports.WORKER_DATA_KIND = WORKER_DATA_KIND;
module.exports.decodeError = decodeError;
module.exports.encodeError = encodeError;
module.exports.toError = toError;
