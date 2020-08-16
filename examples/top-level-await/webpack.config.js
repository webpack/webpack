module.exports = {
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	experiments: {
		topLevelAwait: true
	}
};
