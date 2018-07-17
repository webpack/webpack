module.exports = {
	// mode: "development" || "production",
	optimization: {
		usedExports: true,
		concatenateModules: true,
		chunkIds: "total-size" // To keep filename consistent between different modes (for example building only)
	}
};
