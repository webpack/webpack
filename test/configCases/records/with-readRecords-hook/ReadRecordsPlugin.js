/** @import { Compiler } from "../../../../" */

class ReadRecordsPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.readRecords.tapAsync("ReadRecordsPlugin", callback => {
			setTimeout(() => {
				callback();
			}, 1000);
		});
	}
}

module.exports = ReadRecordsPlugin;
