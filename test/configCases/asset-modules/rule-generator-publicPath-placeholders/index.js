import plainUrl from "../_images/file.png?plain";
import emptyUrl from "../_images/file.png?empty";
import fnameUrl from "../_images/file.png?fname";
import modIdUrl from "../_images/file.png?modid";
import modHashUrl from "../_images/file.png?modhash";
import contentHashUrl from "../_images/file.png?ch";
import hashUrl from "../_images/file.png?hash";
import runtimeUrl from "../_images/file.png?rt";
import fnUrl from "../_images/file.png?fn";
import combinedUrl from "../_images/file.png?combined";
import jpgUrl from "../_images/file.jpg";
import svgUrl from "../_images/file.svg";

const HEX = "[a-f0-9]";

it("should support plain string publicPath in rule.generator.publicPath", () => {
	expect(plainUrl).toBe("plain/file.png");
});

it("should support empty string publicPath in rule.generator.publicPath", () => {
	expect(emptyUrl).toBe("file.png");
});

it("should interpolate filename placeholders ([name], [ext], [base], [path]) in rule.generator.publicPath", () => {
	// sourceFilename is something like "../_images/file.png?fname"
	// [name] = "file", [ext] = ".png", [base] = "file.png", [path] = "../_images/"
	expect(fnameUrl).toMatch(
		/^fname\/file\.png\/file\.png\/\.\.\/_images\/\/file\.png$/
	);
});

it("should interpolate [id] placeholder in rule.generator.publicPath", () => {
	expect(modIdUrl).toMatch(/^modid\/[\w./\\-]+\/file\.png$/);
});

it("should interpolate [modulehash] placeholder in rule.generator.publicPath", () => {
	expect(modHashUrl).toMatch(new RegExp(`^modhash/${HEX}+/file\\.png$`));
});

it("should interpolate [contenthash] placeholder with length in rule.generator.publicPath", () => {
	expect(contentHashUrl).toMatch(new RegExp(`^ch/${HEX}{8}/file\\.png$`));
});

it("should interpolate [hash] placeholder in rule.generator.publicPath", () => {
	expect(hashUrl).toMatch(new RegExp(`^h/${HEX}+/file\\.png$`));
});

it("should interpolate [runtime] placeholder in rule.generator.publicPath", () => {
	expect(runtimeUrl).toBe("rt/main/file.png");
});

it("should support function-form publicPath returning placeholders in rule.generator.publicPath", () => {
	expect(fnUrl).toMatch(new RegExp(`^fn/${HEX}{8}/file\\.png$`));
});

it("should interpolate combined placeholders ([runtime], [id], [contenthash]) in rule.generator.publicPath", () => {
	expect(combinedUrl).toMatch(
		new RegExp(`^c/main/[\\w./\\\\-]+/${HEX}{6}/file\\.png$`)
	);
});

it("should interpolate placeholders for non-png assets (.jpg) in rule.generator.publicPath", () => {
	expect(jpgUrl).toMatch(new RegExp(`^jpg/${HEX}{10}/file\\.jpg/file\\.jpg$`));
});

it("should interpolate placeholders for non-png assets (.svg) in rule.generator.publicPath", () => {
	expect(svgUrl).toMatch(new RegExp(`^svg/${HEX}+/\\.svg/file\\.svg$`));
});
