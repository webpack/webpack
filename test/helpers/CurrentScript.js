class CurrentScript {
	constructor(path = "", type = "text/javascript") {
		this.src = `https://test.cases/path/${path}index.js`;
		this.type = type;
		this.tagName = "script";
	}
}

module.exports = CurrentScript;
