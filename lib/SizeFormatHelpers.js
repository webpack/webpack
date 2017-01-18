/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
var SizeFormatHelpers = exports;

SizeFormatHelpers.formatSize = function(size) {
	if(size <= 0) {
		return "0 bytes";
	}

	var abbreviations = ["bytes", "kB", "MB", "GB"];
	var index = Math.floor(Math.log(size) / Math.log(1000));

	return +(size / Math.pow(1000, index))
		.toPrecision(3) + " " + abbreviations[index];
};
