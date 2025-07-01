"use strict";

module.exports = {
	// mode: "development" || "production",
	optimization: {
		usedExports: true,
		concatenateModules: true,
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	}
};
