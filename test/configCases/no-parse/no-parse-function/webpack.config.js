/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		noParse: function (content) {
			return /not-parsed/.test(content);
		}
	}
};
