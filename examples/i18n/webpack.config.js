var path = require("path");
var I18nPlugin = require("i18n-webpack-plugin");
var languages = {
	"en": null,
	"de": require("./de.json")
};
module.exports = Object.keys(languages).map(function(language) {
	return {
		name: language,
		entry: "./example",
		output: {
			path: path.join(__dirname, "js"),
			filename: language + ".output.js"
		},
		plugins: [
			new I18nPlugin(
				languages[language]
			)
		]
	};
});
