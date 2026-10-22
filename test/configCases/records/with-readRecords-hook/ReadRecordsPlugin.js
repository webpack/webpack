/** @import { Compiler } from "../../../../" */

class ReadRecordsPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.readRecords.tapAsync("ReadRecordsPlugin", callback => {
			setTimeout(() => {
				callback();
			}, 10);
		});
	}
}

module.exports = ReadRecordsPlugin;
