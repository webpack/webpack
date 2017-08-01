var GlobalObjectPlugin = require("../../../../lib/GlobalObjectPlugin");
var ProvidePlugin = require("../../../../lib/ProvidePlugin");

module.exports = {
	plugins: [
    new GlobalObjectPlugin("window"),
    new ProvidePlugin({
      "window.foo": "./foo"
    })
	]
};
