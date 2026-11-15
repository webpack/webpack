/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/**
 * A call whose arguments could not be structured-cloned before reaching a thread.
 */
class WorkerJobCloneError extends Error {
	/**
	 * @param {string} message error message
	 * @param {ErrorOptions=} options error options
	 */
	constructor(message, options) {
		super(message, options);
		this.name = "WorkerJobCloneError";
	}
}

module.exports = WorkerJobCloneError;
