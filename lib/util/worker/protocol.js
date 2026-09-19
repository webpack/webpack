/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @typedef {import("../../logging/Logger").LogTypeEnum} LogTypeEnum */

/** What `postMessage` can hand over instead of copy */
/** @typedef {ArrayBuffer | import("worker_threads").MessagePort} TransferListItem */

/**
 * A function addressed by the absolute path of a CommonJS module and the name of its export. The receiving side requires the module on first use and keeps it.
 * @typedef {object} ModuleTarget
 * @property {string} module absolute path of the module
 * @property {string} method name of the export to call
 */

/**
 * A function the other side exposed, addressed by the id of its handle.
 * @typedef {object} HandleTarget
 * @property {number} handle id of the handle
 */

/** @typedef {ModuleTarget | HandleTarget} CallTarget */

/**
 * How a value crosses the port: structured clone, or the buffers `buffersSerializer` makes of a class registered with `makeSerializable`.
 * @typedef {"clone" | "webpack"} Encoding
 */

/**
 * An error in transit. `fields` carries the own enumerable properties; `webpack` carries the registered form when the class has one.
 * @typedef {object} EncodedError
 * @property {string} name error name
 * @property {string} message error message
 * @property {string=} stack stack trace
 * @property {number=} workerId the thread it was thrown in; absent when the main thread threw it
 * @property {Record<string, unknown>=} fields own enumerable properties
 * @property {Buffer[]=} webpack the `buffersSerializer` form
 */

/**
 * A call in either direction. `id` is set only when a response is wanted; each direction numbers its own calls.
 * @typedef {object} CallMessage
 * @property {"call"} type message type
 * @property {number=} id echoed by the response
 * @property {CallTarget} target what to run
 * @property {unknown[]} args arguments after the worker context
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
 * The only spawn-time state. Everything else, options included, arrives later as a shared reference.
 * @typedef {object} InitMessage
 * @property {"init"} type message type
 * @property {number} workerId id the farm gave this thread
 * @property {string[]} preload absolute paths of modules to load before `ready`
 */

/**
 * Pushes a shared value to one thread; sent before the first call there that refers to it.
 * @typedef {object} ShareMessage
 * @property {"share"} type message type
 * @property {number} ref the number calls refer to it by
 * @property {Encoding} encoding how `value` was encoded
 * @property {unknown} value the value, or its buffers
 */

/**
 * @typedef {object} UnshareMessage
 * @property {"unshare"} type message type
 * @property {number} ref reference to forget
 */

/**
 * Asks the thread to flush and exit on its own, instead of being terminated.
 * @typedef {object} CloseMessage
 * @property {"close"} type message type
 */

/**
 * @typedef {object} ReadyMessage
 * @property {"ready"} type message type
 * @property {number} workerId id the thread was given
 */

/**
 * @typedef {object} LogEntry
 * @property {string} name logger name
 * @property {LogTypeEnum} type log type
 * @property {unknown[]} args log arguments
 */

/**
 * Entries batched by a thread and replayed on the main thread's infrastructure logger.
 * @typedef {object} LogMessage
 * @property {"log"} type message type
 * @property {LogEntry[]} entries entries in the order they were logged
 */

/** @typedef {InitMessage | ShareMessage | UnshareMessage | CloseMessage | CallMessage | ResponseMessage} MainToWorkerMessage */
/** @typedef {ReadyMessage | LogMessage | CallMessage | ResponseMessage} WorkerToMainMessage */

/** Every `type` a message carries, for both sides of the port */
const MESSAGE_TYPE = Object.freeze({
	INIT: /** @type {"init"} */ ("init"),
	SHARE: /** @type {"share"} */ ("share"),
	UNSHARE: /** @type {"unshare"} */ ("unshare"),
	CLOSE: /** @type {"close"} */ ("close"),
	CALL: /** @type {"call"} */ ("call"),
	RESPONSE: /** @type {"response"} */ ("response"),
	READY: /** @type {"ready"} */ ("ready"),
	LOG: /** @type {"log"} */ ("log")
});

/**
 * A value together with the buffers to hand over rather than copy. The runtime unwraps it before posting.
 * @template T
 */
class TransferResult {
	/**
	 * @param {T} value the value to send
	 * @param {TransferListItem[]} transfer buffers the sender allocated whole; a slice of a pooled Buffer must be copied instead
	 */
	constructor(value, transfer) {
		this.value = value;
		this.transfer = transfer;
	}
}

/**
 * @param {unknown} error what was thrown
 * @param {number=} workerId the thread it was thrown in
 * @returns {EncodedError} its wire form
 */
const encodeError = (error, workerId) => {
	if (!(error instanceof Error)) {
		return { name: "Error", message: String(error), workerId };
	}
	const own = /** @type {Record<string, unknown>} */ (
		/** @type {unknown} */ (error)
	);
	/** @type {Record<string, unknown>} */
	const fields = {};
	for (const key of Object.keys(error)) fields[key] = own[key];
	return {
		name: error.name,
		message: error.message,
		stack: error.stack,
		workerId,
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

module.exports.MESSAGE_TYPE = MESSAGE_TYPE;
module.exports.TransferResult = TransferResult;
module.exports.decodeError = decodeError;
module.exports.encodeError = encodeError;
