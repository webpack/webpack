// The config case's `it` and `expect`, logging what each assertion reads,
// so a print that changes a value or a throw runs otherwise.
var show = function (value) {
	if (typeof value === "function") return "[function]";
	try {
		return String(JSON.stringify(value, function (key, one) {
			return typeof one === "bigint" ? one + "n" : typeof one === "function" ? "[function]" : one;
		}));
	} catch (error) {
		return String(value);
	}
};
var it = function (title, body) {
	console.log("it", title);
	try {
		body(function () {});
	} catch (error) {
		console.log("throws", error && error.name);
	}
};
var expect = function (value) {
	var matchers = new Proxy({}, {
		get: function (target, name) {
			if (name === "not" || name === "resolves" || name === "rejects") return matchers;
			return function () {
				if (/Snapshot$/.test(name)) return;
				if (/^toThrow/.test(name) && typeof value === "function") {
					try {
						console.log(name, "returns", show(value()));
					} catch (error) {
						console.log(name, "throws", error && error.name);
					}
					return;
				}
				console.log(name, show(value));
			};
		}
	});
	return matchers;
};

function element(type, children) {
	return { type, children };
}

function tag(type, children) {
	return `<${type}>${children.join("")}</${type}>`;
}

function render(jsx) {
	const icon = /*#__PURE__*/ jsx("i", []);
	return /*#__PURE__*/ jsx("div", [/*#__PURE__*/ jsx("b", []), icon]);
}

function renderLogged(jsx, log) {
	const icon = /*#__PURE__*/ jsx("i", []);
	return /*#__PURE__*/ jsx("div", [log("b"), icon]);
}

it("should move a pure call's value past another pure call", () => {
	const seen = [];
	const log = (value) => {
		seen.push(value);
		return value;
	};
	expect(render(element)).toEqual({
		type: "div",
		children: [
			{ type: "b", children: [] },
			{ type: "i", children: [] }
		]
	});
	expect(render(tag)).toBe("<div><b></b><i></i></div>");
	expect(renderLogged(tag, log)).toBe("<div>b<i></i></div>");
	expect(renderLogged(element, log)).toEqual({
		type: "div",
		children: ["b", { type: "i", children: [] }]
	});
	expect(seen).toEqual(["b", "b"]);
});
