"use strict";

/**
 * Tests that importExportsPresence / reexportExportsPresence correctly override
 * exportsPresence and strictExportPresence via resolveFromOptions.
 *
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				// importExportsPresence="error" overrides exportsPresence="warn"
				// reexportExportsPresence="warn" overrides exportsPresence="warn"
				test: /eee/,
				parser: {
					exportsPresence: "warn",
					importExportsPresence: "error",
					reexportExportsPresence: "warn"
				}
			},
			{
				// importExportsPresence=false silences despite strictExportPresence
				// reexportExportsPresence="error" overrides strictExportPresence
				test: /fff/,
				parser: {
					strictExportPresence: true,
					importExportsPresence: false,
					reexportExportsPresence: "error"
				}
			}
		]
	}
};
