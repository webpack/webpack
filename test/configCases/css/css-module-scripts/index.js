import sheet from './style.css' assert { type: 'css' }
import basicSheet from './basic.css' assert { type: "css"}

it('should adopt sheet', () => {
	document.adoptedStyleSheets = [sheet]
    const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" blue");
	expect(style.getPropertyValue("color")).toBe(" red");
})

it('should compile url', (done) => {
	expect(basicSheet._css).toMatchSnapshot()
	done()
})