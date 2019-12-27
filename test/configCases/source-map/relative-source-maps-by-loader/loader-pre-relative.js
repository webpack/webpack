module.exports = function() {
	this.callback(null, "module.exports = 'ok';", {
		version: 3,
		file: "/should/be/removed",
		sources: ["webpack://./folder/test6.txt"],
		sourcesContent: ["Test"],
		mappings: "AAAA"
	});
};
