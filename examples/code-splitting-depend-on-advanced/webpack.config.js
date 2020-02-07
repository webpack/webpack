module.exports = {
	entry: {
		app: { import: "./app.js", dependOn: ["other-vendors"] },
		page1: { import: "./page1.js", dependOn: ["app", "react-vendors"] },
		"react-vendors": ["react", "react-dom", "prop-types"],
		"other-vendors": "./other-vendors"
	},
	optimization: {
		runtimeChunk: "single",
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	},
	stats: {
		chunks: true,
		chunkRelations: true
	}
};
