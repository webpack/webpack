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
