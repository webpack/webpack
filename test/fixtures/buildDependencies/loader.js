// eslint-disable-next-line node/no-missing-require
const value = require("../../js/buildDepsInput/loader-dependency");

module.exports = () => {
	return `module.exports = ${value};`;
};
