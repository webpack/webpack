import cssContent from "http://localhost:9990/index.css?query#fragment";
import noCacheCssContent from "http://localhost:9990/index.css?no-cache";
import cachedCssContent from "http://localhost:9990/index.css?cache";
import { value, value2 } from "http://localhost:9990/resolve.js";
import { fallback } from "http://localhost:9990/fallback.js";
import redirect1 from "http://localhost:9990/redirect";
import redirect2 from "http://localhost:9990/redirect.js";
import text from "http://localhost:9990/asset.txt";
import textUrl from "http://localhost:9990/url.js";
import license1 from "https://raw.githubusercontent.com//webpack//webpack//main/LICENSE";
import license2 from "https://raw.githubusercontent.com/webpack/webpack/main/LICENSE";

it("http url request should be supported", () => {
	expect(cssContent).toBe("a {}.webpack{}");
	expect(noCacheCssContent).toBe("a {}.webpack{}");
	expect(cachedCssContent).toBe("a {}.webpack{}");
	expect(value).toBe(42);
	expect(value2).toBe(42);
	expect(fallback).toBe(42);
	expect(redirect1).toEqual({ ok: true });
	expect(redirect2).toEqual({ ok: true });
	expect(redirect2).not.toBe(redirect1);
	expect(text.trim()).toBe("Hello World");
	expect(textUrl instanceof URL).toBeTruthy();
	expect(textUrl.href).toMatch(/^file:\/\/.+\.txt\?query$/);
});

it("https url request should be supported", () => {
	expect(license1.includes("Copyright JS Foundation and other contributors")).toBeTruthy();
	expect(license2.includes("Copyright JS Foundation and other contributors")).toBeTruthy();
});
