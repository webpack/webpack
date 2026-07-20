module.exports = "before";

if (typeof __undefinedGlobal__ === "undefined") {
	return;
}

module.exports = "after";
