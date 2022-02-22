"use strict";

module.exports = function loader(data) {
	return `export default new RegExp(${JSON.stringify(data.trim())})`
}
