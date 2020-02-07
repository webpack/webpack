module.exports = {
	mode: "production",
	entry: {
		a: "./a.js",
		b: { import: "./b.js", filename: "c.js" }
	},
	profile: true,
	stats: {
		reasons: true,
		chunks: true,
		chunkModules: true,
		chunkRelations: true,
		chunkOrigins: true,
		modules: false,
		publicPath: true
	}
};
