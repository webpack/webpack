/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function formatLocation(loc) {
	if(typeof loc === "string")
		return loc;
	if(typeof loc === "number")
		return loc;
	if(loc && typeof loc === "object") {
		if(loc.start && loc.end) {
			if(typeof loc.start.line === "number" && typeof loc.end.line === "number" && typeof loc.end.column === "number" && loc.start.line === loc.end.line)
				return formatPosition(loc.start) + "-" + loc.end.column;
			return formatPosition(loc.start) + "-" + formatPosition(loc.end);
		}
		if(loc.start)
			return formatPosition(loc.start);
		return formatPosition(loc);
	}
	return "";

	function formatPosition(pos) {
		if(typeof pos === "string")
			return pos;
		if(typeof pos === "number")
			return pos;
		if(pos && typeof pos === "object") {
			if(typeof pos.line === "number" && typeof pos.column === "number")
				return pos.line + ":" + pos.column;
			if(typeof pos.line === "number")
				return pos.line + ":?";
			if(typeof pos.index === "number")
				return "+" + pos.index;
			return pos + "";
		}
		return "";
	}
};
