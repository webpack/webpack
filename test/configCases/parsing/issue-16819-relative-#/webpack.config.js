"use strict";

// Companion to issue-16819-#-in-path-#: same project layout, but the entry is
// expressed as a relative request with a query string. Without escaping, the
// resolver mis-splits `#` in the directory portion and fails.
module.exports = {
	entry: "./#dir/index.js?protocol=ws&port=8080"
};
