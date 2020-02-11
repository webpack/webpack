module.exports = {
	entry: {
		app: { import: "./app.js", dependOn: ["react-vendors"] },
		"react-vendors": ["react", "react-dom", "prop-types"]
	},
	optimization: {
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	},
	stats: {
		chunks: true,
		chunkRelations: true
	}
};
