// no "use strict": this module bails out of the concatenation, which is what
// keeps "settings" and "shared" out of it and leaves each one a concatenation
// of its own
global.__nestedConcatOrder = (global.__nestedConcatOrder || []).concat(
	"legacy"
);

exports.describeSettings = function describeSettings() {
	return `diagnostics: ${require("./settings").settings.apiBase}`;
};

exports.describeShared = function describeShared() {
	return require("./shared").shared;
};
