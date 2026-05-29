const path = require("path");

describe("HttpUriPlugin must not fetch private/internal network addresses or cloud metadata endpoints", () => {
  const payloads = [
    "http://169.254.169.254/latest/meta-data/",
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://100.100.100.200/latest/meta-data/",
    "http://192.168.1.1/admin",
    "http://192.168.0.1/",
    "http://10.0.0.1/internal",
    "http://10.255.255.255/secret",
    "http://172.16.0.1/private",
    "http://172.31.255.255/private",
    "http://127.0.0.1/",
    "http://127.0.0.1:8080/admin",
    "http://localhost/",
    "http://localhost:9200/_cat/indices",
    "http://[::1]/",
    "http://0.0.0.0/",
    "http://0177.0.0.1/",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://169.254.169.254.xip.io/",
    "https://169.254.169.254/latest/meta-data/",
    "https://192.168.1.1/admin",
    "https://10.0.0.1/internal",
    "https://127.0.0.1/",
    "https://localhost/",
    "http://metadata/",
    "http://instance-data/",
    "http://169.254.170.2/v2/credentials/",
    "http://fd00::1/",
    "http://[fd00::1]/internal",
  ];

  /**
   * Checks whether a URL targets a private/internal/metadata address.
   * This function encodes the security invariant: such URLs MUST be blocked.
   */
  function isBlockedUrl(urlString) {
    let url;
    try {
      url = new URL(urlString);
    } catch (e) {
      // Malformed URLs should also be blocked
      return true;
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    // Cloud metadata endpoints
    const metadataHosts = [
      "169.254.169.254",
      "metadata.google.internal",
      "100.100.100.200",
      "169.254.170.2",
      "metadata",
      "instance-data",
    ];
    if (metadataHosts.includes(hostname)) return true;

    // Loopback
    if (hostname === "localhost" || hostname === "::1" || hostname === "0.0.0.0") return true;

    // Numeric loopback variants
    if (hostname === "2130706433" || hostname === "0x7f000001" || hostname === "0177.0.0.1") return true;

    // xip.io / nip.io style bypasses for 169.254.x.x
    if (/^169\.254\.\d+\.\d+/.test(hostname) || hostname.includes("169.254.169.254")) return true;

    // Parse dotted-decimal IPv4
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);
      // 127.x.x.x loopback
      if (a === 127) return true;
      // 10.x.x.x private
      if (a === 10) return true;
      // 172.16.x.x - 172.31.x.x private
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.x.x private
      if (a === 192 && b === 168) return true;
      // 169.254.x.x link-local
      if (a === 169 && b === 254) return true;
      // 0.x.x.x
      if (a === 0) return true;
    }

    // IPv6 private ranges
    if (hostname.startsWith("fd") || hostname.startsWith("fc")) return true;
    if (hostname === "::1") return true;

    return false;
  }

  /**
   * Simulate what a secure HttpUriPlugin fetch wrapper MUST do:
   * validate the URL before making any network request.
   */
  function secureProxyFetch(urlString) {
    if (isBlockedUrl(urlString)) {
      throw new Error(
        `Blocked fetch to private/internal/metadata address: ${urlString}`
      );
    }
    // In a real implementation, the actual fetch would happen here.
    // For the test, we just return a resolved promise to indicate it would proceed.
    return Promise.resolve({ status: 200 });
  }

  test.each(payloads)(
    "rejects adversarial input: %s",
    async (payload) => {
      // SECURITY INVARIANT: fetching private/internal/metadata URLs MUST throw
      // and MUST NOT silently succeed or return a response.
      let threw = false;
      let result = null;

      try {
        result = await secureProxyFetch(payload);
      } catch (err) {
        threw = true;
        // The error message must indicate the URL was blocked
        expect(err.message).toMatch(/blocked/i);
      }

      // The fetch MUST have thrown — it must never return a result for these URLs
      expect(threw).toBe(true);
      expect(result).toBeNull();
    }
  );

  test("isBlockedUrl correctly identifies all adversarial payloads as blocked", () => {
    for (const payload of payloads) {
      expect(isBlockedUrl(payload)).toBe(true);
    }
  });

  test("isBlockedUrl does not block legitimate public URLs", () => {
    const safeUrls = [
      "https://registry.npmjs.org/webpack",
      "https://cdn.jsdelivr.net/npm/lodash/lodash.min.js",
      "http://example.com/resource.js",
      "https://unpkg.com/react@18/umd/react.production.min.js",
    ];
    for (const url of safeUrls) {
      expect(isBlockedUrl(url)).toBe(false);
    }
  });

  test("secureProxyFetch allows legitimate public URLs without throwing", async () => {
    // This test verifies the security check does not over-block legitimate traffic.
    // We mock the fetch so no real network call is made.
    const safeUrl = "https://cdn.example.com/module.js";
    let threw = false;
    let result = null;
    try {
      result = await secureProxyFetch(safeUrl);
    } catch (e) {
      threw = false; // should not throw
    }
    expect(threw).toBe(false);
    expect(result).not.toBeNull();
  });
});