var webpack = require("../../../../"); // eslint-disable-line

module.exports = {
    plugins: [
        new webpack.DllReferencePlugin({
            name: "../4-create-dll-with-packagename/dll.js",
            manifest: require("../../../js/config/dll-plugin/manifest1.json"), // eslint-disable-line
            sourceType: "commonjs2",
        }),
        new webpack.NamedModulesPlugin()
    ]
};
