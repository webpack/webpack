require.context('./test1', true, /\.less$/);
require('./test2/shared.less');

it("should contain only black", function() {
	const style = getComputedStyle(document.body);

	expect(style["color-dark"]).toBe(" black");
	expect(style["background-dark"]).toBe(" black");
});
