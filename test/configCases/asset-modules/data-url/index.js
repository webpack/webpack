import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";
import dataSvg from "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48dGl0bGU+aWNvbi1zcXVhcmUtc21hbGw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0zMDAgLjFMNTY1IDE1MHYyOTkuOUwzMDAgNTk5LjggMzUgNDQ5LjlWMTUweiIvPjxwYXRoIGZpbGw9IiM4RUQ2RkIiIGQ9Ik01MTcuNyA0MzkuNUwzMDguOCA1NTcuOHYtOTJMNDM5IDM5NC4xbDc4LjcgNDUuNHptMTQuMy0xMi45VjE3OS40bC03Ni40IDQ0LjF2MTU5bDc2LjQgNDQuMXpNODEuNSA0MzkuNWwyMDguOSAxMTguMnYtOTJsLTEzMC4yLTcxLjYtNzguNyA0NS40em0tMTQuMy0xMi45VjE3OS40bDc2LjQgNDQuMXYxNTlsLTc2LjQgNDQuMXptOC45LTI2My4yTDI5MC40IDQyLjJ2ODlsLTEzNy4zIDc1LjUtMS4xLjYtNzUuOS00My45em00NDYuOSAwTDMwOC44IDQyLjJ2ODlMNDQ2IDIwNi44bDEuMS42IDc1LjktNDR6Ii8+PHBhdGggZmlsbD0iIzFDNzhDMCIgZD0iTTI5MC40IDQ0NC44TDE2MiAzNzQuMVYyMzQuMmwxMjguNCA3NC4xdjEzNi41em0xOC40IDBsMTI4LjQtNzAuNnYtMTQwbC0xMjguNCA3NC4xdjEzNi41ek0yOTkuNiAzMDN6bS0xMjktODVsMTI5LTcwLjlMNDI4LjUgMjE4bC0xMjguOSA3NC40LTEyOS03NC40eiIvPjwvc3ZnPgo=";
const urlSvg = new URL(
	"data:image/svg;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48dGl0bGU+aWNvbi1zcXVhcmUtc21hbGw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0zMDAgLjFMNTY1IDE1MHYyOTkuOUwzMDAgNTk5LjggMzUgNDQ5LjlWMTUweiIvPjxwYXRoIGZpbGw9IiM4RUQ2RkIiIGQ9Ik01MTcuNyA0MzkuNUwzMDguOCA1NTcuOHYtOTJMNDM5IDM5NC4xbDc4LjcgNDUuNHptMTQuMy0xMi45VjE3OS40bC03Ni40IDQ0LjF2MTU5bDc2LjQgNDQuMXpNODEuNSA0MzkuNWwyMDguOSAxMTguMnYtOTJsLTEzMC4yLTcxLjYtNzguNyA0NS40em0tMTQuMy0xMi45VjE3OS40bDc2LjQgNDQuMXYxNTlsLTc2LjQgNDQuMXptOC45LTI2My4yTDI5MC40IDQyLjJ2ODlsLTEzNy4zIDc1LjUtMS4xLjYtNzUuOS00My45em00NDYuOSAwTDMwOC44IDQyLjJ2ODlMNDQ2IDIwNi44bDEuMS42IDc1LjktNDR6Ii8+PHBhdGggZmlsbD0iIzFDNzhDMCIgZD0iTTI5MC40IDQ0NC44TDE2MiAzNzQuMVYyMzQuMmwxMjguNCA3NC4xdjEzNi41em0xOC40IDBsMTI4LjQtNzAuNnYtMTQwbC0xMjguNCA3NC4xdjEzNi41ek0yOTkuNiAzMDN6bS0xMjktODVsMTI5LTcwLjlMNDI4LjUgMjE4bC0xMjguOSA3NC40LTEyOS03NC40eiIvPjwvc3ZnPgo="
);
const urlSvg2 = new URL(
	"data:image/svg+xml;p=1;q=2,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke=\"%23343a40\" stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e",
	import.meta.url
);
const helloWorld = new URL("data:text/plain,Hello", import.meta.url);
const helloWorldBase64 = new URL(
	"data:text/plain;base64,SGVsbG8=",
	import.meta.url
);

const urlSvg3 = new URL(
	"data:image/svg+xml;,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 aria-hidden=%27true%27 fill=%27%23535A60%27 width=%2718%27 height=%2718%27 viewBox=%270 0 18 18%27%3E%3Cpath d=%27M3 3a2 2 0 012-2h6l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V3zm7-1.5V6h4.5L10 1.5z%27%3E%3C/path%3E%3C/svg%3E",
	import.meta.url
);

it("should generate various data-url types", () => {
	expect(png).toContain("data:image/png;base64,");
	expect(svg).toContain("data:image/svg+xml;base64");
	expect(jpg).toContain("data:image/jpeg;base64,");
	expect(dataSvg).toContain("data:image/svg+xml;base64,");
	expect(urlSvg.href).toContain("data:image/svg;base64,");
	expect(urlSvg2.href).toContain(
		"data:image/svg+xml;p=1;q=2,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke=\"%23343a40\" stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e"
	);
	expect(urlSvg3.href).toContain("data:image/svg+xml,");
	expect(helloWorld.href).toContain("data:text/plain,Hello%2C%20World%21");
	expect(helloWorldBase64.href).toContain(
		"data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=="
	);
});
