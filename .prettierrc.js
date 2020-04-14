module.exports = {
	printWidth: 80,
	useTabs: true,
	tabWidth: 2,
	trailingComma: "none",
	arrowParens: "avoid",
	overrides: [
		{
			files: "*.json",
			options: {
				useTabs: false
			}
		}
	]
};
