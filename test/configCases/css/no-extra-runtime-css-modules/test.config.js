"use strict";

module.exports = {
	findBundle(i) {
		switch (i) {
			case 0:
				return ["test.js"];
			case 1:
				return ["test.js", "1/main.js"];
			case 2:
				return ["test.js", "2/main.js"];
		}
	}
};
