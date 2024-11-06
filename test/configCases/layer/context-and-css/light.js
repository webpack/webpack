require.context('./test1', true, /\.less$/);
require('./test2/shared.less');

it("should contain only white", function() {
	const style = getComputedStyle(document.body);

	expect(style["color-light"]).toBe(" white");
	expect(style["background-light"]).toBe(" white");
});
