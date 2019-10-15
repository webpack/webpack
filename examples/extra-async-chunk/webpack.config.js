module.exports = {
	// mode: "development || "production",
	optimization: {
		splitChunks: {
			minSize: 0 // This example is too small
		},
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};
