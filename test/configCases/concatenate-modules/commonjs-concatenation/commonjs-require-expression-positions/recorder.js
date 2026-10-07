"use strict";

const records = [];

module.exports = {
	records,
	record(entry) {
		records.push(entry);
	}
};
