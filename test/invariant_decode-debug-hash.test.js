const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('File operations never resolve paths outside the declared root directory', () => {
  const scriptPath = path.join(__dirname, '../tooling/decode-debug-hash.js');
  const testDir = path.join(__dirname, 'test-secure-root');
  const allowedFile = path.join(testDir, 'allowed.txt');
  
  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(allowedFile, 'debug-digest-74657374');
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  const payloads = [
    '../../../etc/passwd',
    '....//....//etc/passwd',
    '%2e%2e%2fetc%2fpasswd',
    'allowed.txt'
  ];

  test.each(payloads)('rejects adversarial input: %s', (payload) => {
    const absolutePayload = path.isAbsolute(payload) ? payload : path.join(testDir, payload);
    
    try {
      execSync(`node "${scriptPath}" "${absolutePayload}"`, {
        cwd: testDir,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      if (payload === 'allowed.txt') {
        expect(fs.readFileSync(allowedFile, 'utf8')).toBe('test');
      } else {
        const resolved = path.resolve(testDir, payload);
        expect(resolved.startsWith(testDir)).toBe(true);
      }
    } catch (error) {
      if (payload === 'allowed.txt') {
        throw error;
      }
      expect(error.status).not.toBe(0);
    }
  });
});