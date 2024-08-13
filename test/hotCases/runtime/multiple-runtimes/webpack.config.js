module.exports = {
	entry: {
		main: "./main.js",
		fileA: "./fileA.js",
		fileB: "./fileB.js"
	},
	output: {
		filename: "[name].js",
		hotUpdateGlobal: ({ chunk }) => `webpackHotUpdate_${chunk.id}`
	}
};
