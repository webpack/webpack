module.exports = {
	output: {
		libraryTarget: "umd2"
	},
    externals: {
        abc: {
            root: "Abc",
            commonjs: "abc"
        }
    }
};
