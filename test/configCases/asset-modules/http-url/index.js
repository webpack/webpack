import cssContent from "http://localhost:9990/index.css?query#fragment";
import noCacheCssContent from "http://localhost:9990/index.css?no-cache";
import cachedCssContent from "http://localhost:9990/index.css?cache";
import { value, value2 } from "http://localhost:9990/resolve.js";
import { fallback } from "http://localhost:9990/fallback.js";
import redirect1 from "http://localhost:9990/redirect";
import redirect2 from "http://localhost:9990/redirect.js";
import text from "http://localhost:9990/asset.txt";
import textUrl from "http://localhost:9990/url.js";
import license1 from "http://localhost:9990//LICENSE";
import license2 from "http://localhost:9990/LICENSE";
import { value as gzipValue } from "http://localhost:9990/resolve.js?gzip";
import { value as brValue } from "http://localhost:9990/resolve.js?br";
import { value as deflateValue } from "http://localhost:9990/resolve.js?deflate";
import { value as redirectValue } from "http://localhost:9990/resolve.js?redirect";

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

it("http url request for an extension-less asset should be supported", () => {
	expect(license1.includes("Copyright JS Foundation and other contributors")).toBeTruthy();
	expect(license2.includes("Copyright JS Foundation and other contributors")).toBeTruthy();
});

it("http url request with content-encoding should be supported", () => {
	expect(gzipValue).toBe(42);
	expect(brValue).toBe(42);
	expect(deflateValue).toBe(42);
});

it("http url with a revalidated redirect should be supported", () => {
	expect(redirectValue).toBe(42);
});
