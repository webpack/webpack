/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import WebpackError from "./WebpackError.js";
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */

/**
 * Warning used for comment-related compilation issues, such as malformed magic
 * comments that webpack can parse but wants to report.
 */
class CommentCompilationWarning extends WebpackError {
	/**
	 * Captures a warning message together with the dependency location that
	 * triggered it.
	 * @param {string} message warning message
	 * @param {DependencyLocation} loc affected lines of code
	 */
	constructor(message, loc) {
		super(message);

		/** @type {string} */
		this.name = "CommentCompilationWarning";
		/** @type {DependencyLocation} */
		this.loc = loc;
	}
}

makeSerializable(
	CommentCompilationWarning,
	"webpack/lib/errors/CommentCompilationWarning"
);

export default CommentCompilationWarning;

export { CommentCompilationWarning as "module.exports" };
