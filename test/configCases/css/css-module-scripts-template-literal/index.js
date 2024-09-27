import sheet from './style.css' assert { type: 'css' }
import basicSheet from './basic.css' assert { type: "css"}
import basicSheet1 from './basic.css'

it('should adopt sheet', () => {
	document.adoptedStyleSheets = [sheet]
    const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" blue");
	expect(style.getPropertyValue("color")).toBe(" red");
})

it('should compile basic sheet', (done) => {
	expect(basicSheet.css).toMatchSnapshot()
	expect(basicSheet1).toBeUndefined()
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot()
	done()
})