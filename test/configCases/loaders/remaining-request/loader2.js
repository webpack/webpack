/** @type {import("../../../../").LoaderDefinition<{ f(): any }>} */
module.exports = function (source) {
	if (typeof this.query === "string")
		throw new Error("query must be an object");
	return "module.exports = " + JSON.stringify(this.query.f());
};
