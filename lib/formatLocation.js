/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const formatPosition = pos => {
	if (pos === null) return "";
	const typeOfPos = typeof pos;
	switch (typeOfPos) {
		case "string":
			return pos;
		case "number":
			return `${pos}`;
		case "object":
			if (typeof pos.line === "number" && typeof pos.column === "number")
				return `${pos.line}:${pos.column}`;
			else if (typeof pos.line === "number") return `${pos.line}:?`;
			else if (typeof pos.index === "number") return `+${pos.index}`;
			else return "";
		default:
			return "";
	}
};

const formatLocation = loc => {
	if (loc === null) return "";
	const typeOfLoc = typeof loc;
	switch (typeOfLoc) {
		case "string":
			return loc;
		case "number":
			return `${loc}`;
		case "object":
			if (loc.start && loc.end) {
				if (
					typeof loc.start.line === "number" &&
					typeof loc.end.line === "number" &&
					typeof loc.end.column === "number" &&
					loc.start.line === loc.end.line
				)
					return `${formatPosition(loc.start)}-${loc.end.column}`;
				return `${formatPosition(loc.start)}-${formatPosition(loc.end)}`;
			}
			if (loc.start) return formatPosition(loc.start);
			return formatPosition(loc);
		default:
			return "";
	}
};

module.exports = formatLocation;
