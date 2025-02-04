import './style.css';
import * as style1 from './style1.local.css'
import * as style2 from './style2.global.css'
import './style3.auto.css';
import * as style3 from './style4.modules.css'

it("should not parse css modules in type: css", () => {
    const style = getComputedStyle(document.body);
    expect(style.getPropertyValue("color")).toBe(" red");
    const links = document.getElementsByTagName("link");
    const css = links[1].sheet.css;

	expect(css).toMatch(/\:local\(\.foo\)/);
    expect(css).toMatch(/\:global\(\.bar\)/);
});

it("should compile type: css/module", () => {
    const element = document.createElement(".class2");
    const style = getComputedStyle(element);
    expect(style.getPropertyValue("background")).toBe(" green");
    expect(style1.class1).toBe('_style1_local_css-class1');
});

it("should compile type: css/global", (done) => {
    const element = document.createElement(".class3");
    const style = getComputedStyle(element);
    expect(style.getPropertyValue("color")).toBe(" red");
    expect(style2.class4).toBe('_style2_global_css-class4');
    done()
});

it("should not parse css modules in type: css/auto", () => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" red");
	const links = document.getElementsByTagName("link");
	const css = links[1].sheet.css;
	expect(css).toMatch(/\:local\(\.baz\)/);
	expect(css).toMatch(/\:global\(\.qux\)/);
});

it("should parse css modules in type: css/auto", () => {
	const element = document.createElement(".class3");
	const style = getComputedStyle(element);
	expect(style.getPropertyValue("color")).toBe(" red");
	expect(style3.class3).toBe('_style4_modules_css-class3');
});
