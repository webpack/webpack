module.exports = {
	findBundle: function(i, options) {
		switch (i) {
			case 0:
				return ["./page1.js", "./page2.js"];
			case 1:
				return "./web2.js";
			case 2:
				return "./main.js";
		}
	}
};
