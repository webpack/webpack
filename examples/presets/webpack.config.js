const simple = require("./simple-preset-webpack");
const react = require("./react-preset-webpack");

module.exports = {
	presets: [simple(), react()]
};
