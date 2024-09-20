const urlSvg = new URL(
	"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48dGl0bGU+aWNvbi1zcXVhcmUtc21hbGw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0zMDAgLjFMNTY1IDE1MHYyOTkuOUwzMDAgNTk5LjggMzUgNDQ5LjlWMTUweiIvPjxwYXRoIGZpbGw9IiM4RUQ2RkIiIGQ9Ik01MTcuNyA0MzkuNUwzMDguOCA1NTcuOHYtOTJMNDM5IDM5NC4xbDc4LjcgNDUuNHptMTQuMy0xMi45VjE3OS40bC03Ni40IDQ0LjF2MTU5bDc2LjQgNDQuMXpNODEuNSA0MzkuNWwyMDguOSAxMTguMnYtOTJsLTEzMC4yLTcxLjYtNzguNyA0NS40em0tMTQuMy0xMi45VjE3OS40bDc2LjQgNDQuMXYxNTlsLTc2LjQgNDQuMXptOC45LTI2My4yTDI5MC40IDQyLjJ2ODlsLTEzNy4zIDc1LjUtMS4xLjYtNzUuOS00My45em00NDYuOSAwTDMwOC44IDQyLjJ2ODlMNDQ2IDIwNi44bDEuMS42IDc1LjktNDR6Ii8+PHBhdGggZmlsbD0iIzFDNzhDMCIgZD0iTTI5MC40IDQ0NC44TDE2MiAzNzQuMVYyMzQuMmwxMjguNCA3NC4xdjEzNi41em0xOC40IDBsMTI4LjQtNzAuNnYtMTQwbC0xMjguNCA3NC4xdjEzNi41ek0yOTkuNiAzMDN6bS0xMjktODVsMTI5LTcwLjlMNDI4LjUgMjE4bC0xMjguOSA3NC40LTEyOS03NC40eiIvPjwvc3ZnPgo=",
	import.meta.url
);
const urlHtml = new URL(
	"data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E",
	import.meta.url
);
const urlPng = new URL(
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAABNJREFUCB1jZGBg+A/EDEwgAgQADigBA//q6GsAAAAASUVORK5CYII%3D",
	import.meta.url
);
const urlGif = new URL(
	"data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy7////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABAALAAAAAAQABAAAAVVICSOZGlCQAosJ6mu7fiyZeKqNKToQGDsM8hBADgUXoGAiqhSvp5QAnQKGIgUhwFUYLCVDFCrKUE1lBavAViFIDlTImbKC5Gm2hB0SlBCBMQiB0UjIQA7",
	import.meta.url
);
const urlGif2 = new URL(
	"data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
	import.meta.url
);

it("should extract DataURI's", () => {
	expect(/[0-9abcdef]+\.svg/.test(urlSvg.href)).toBe(true);
	expect(/[0-9abcdef]+\.[0-9abcdef]+\.html/.test(urlHtml.href)).toBe(true);
	expect(/[0-9abcdef]+\.png/.test(urlPng.href)).toBe(true);
	expect(/[0-9abcdef]+\.gif/.test(urlGif.href)).toBe(true);
	expect(/[0-9abcdef]+\.gif/.test(urlGif2.href)).toBe(true);
});
