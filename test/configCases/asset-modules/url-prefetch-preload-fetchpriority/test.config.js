// Mock document.head structure for testing
const mockCreateElement = tagName => {
	const element = {
		_type: tagName,
		_attributes: {},
		setAttribute(name, value) {
			this._attributes[name] = value;
			// Also set as property for fetchPriority
			if (name === "fetchpriority") {
				this.fetchPriority = value;
			}
		},
		getAttribute(name) {
			return this._attributes[name];
		}
	};

	// Set properties based on tag type
	if (tagName === "link") {
		element.rel = "";
		element.as = "";
		element.href = "";
		element.fetchPriority = undefined;
	} else if (tagName === "script") {
		element.src = "";
		element.async = true;
		element.fetchPriority = undefined;
	}

	return element;
};

module.exports = {
	beforeExecute: () => {
		// Mock document for browser environment
		global.document = {
			head: {
				_children: [],
				appendChild(element) {
					this._children.push(element);
				}
			},
			createElement: mockCreateElement
		};

		// Mock window for import.meta.url
		global.window = {
			location: {
				href: "https://test.example.com/"
			}
		};
	},

	findBundle() {
		return ["main.js"];
	},

	moduleScope(scope) {
		// Inject runtime globals that would normally be provided by webpack
		scope.__webpack_require__ = {
			PA(url, as, fetchPriority) {
				const link = global.document.createElement("link");
				link.rel = "prefetch";
				if (as) link.as = as;
				link.href = url;
				if (fetchPriority) {
					link.fetchPriority = fetchPriority;
					link.setAttribute("fetchpriority", fetchPriority);
				}
				global.document.head.appendChild(link);
			},
			LA(url, as, fetchPriority) {
				const link = global.document.createElement("link");
				link.rel = "preload";
				if (as) link.as = as;
				link.href = url;
				if (fetchPriority) {
					link.fetchPriority = fetchPriority;
					link.setAttribute("fetchpriority", fetchPriority);
				}
				global.document.head.appendChild(link);
			},
			b: "https://test.example.com/" // baseURI
		};
	}
};
