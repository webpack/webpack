"use strict";

// two ambiguous names ('late', 'reveal') × two configs (development, production)
const late = [
	/Export name 'late' is ambiguous/,
	/the custom identifier '--late' is not accessible from JavaScript/
];
const reveal = [
	/Export name 'reveal' is ambiguous/,
	/the custom identifier '--reveal' is not accessible from JavaScript/
];

module.exports = [late, reveal, late, reveal];
