const { execSync } = require('child_process');
const path = require('path');

describe("WASM generation script maintains security boundary under adversarial argv input", () => {
  const scriptPath = path.resolve(__dirname, '../tooling/generate-wasm-code.js');
  
  const payloads = [
    // Exact exploit case: attempt to inject --write flag via argument manipulation
    ["--write; echo 'malicious'"],
    // Boundary case: extremely long argument that could cause overflow
    ["a".repeat(10000)],
    // Valid input that should be accepted
    ["--output", "valid.wasm"],
  ];

  test.each(payloads)("script handles adversarial input safely: %s", async (...payload) => {
    // Security property: script must not execute arbitrary commands or crash
    // when given adversarial command-line arguments
    expect(() => {
      // Execute the actual production script with adversarial payload
      execSync(`node ${scriptPath} ${payload.join(' ')}`, {
        stdio: 'pipe',
        timeout: 5000,
        encoding: 'utf-8'
      });
    }).not.toThrow(/Command failed|SyntaxError|ENOENT|malicious/);
  });
});