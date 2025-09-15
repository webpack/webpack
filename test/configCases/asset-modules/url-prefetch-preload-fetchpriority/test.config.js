"use strict";

// Mock document.head structure for testing
const mockCreateElement = (tagName) => {
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
		element.type = undefined;
		element.media = undefined;
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
		// Make document available in the module scope
		scope.document = global.document;
	}
};
