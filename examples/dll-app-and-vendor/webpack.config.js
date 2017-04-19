// export both configs,
// though a real config would likely not build vendor every time
module.exports = [
	require("./webpack.vendor.config"),
	require("./webpack.app.config")
];
