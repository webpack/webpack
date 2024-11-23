const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { keepAlive } = require('../../../src/keepalive'); // Adjust path as per project structure

describe('KeepAlive Hot Module Replacement', () => {
  const testDirectory = path.resolve(__dirname, 'keepalive-test');
  let server;

  beforeAll(() => {
    // Mock a simple HTTP server for testing
    server = http.createServer((req, res) => {
      if (req.headers.accept === 'text/event-stream') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify({ type: 'update', message: 'Hot update available' }));
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(8080);
  });

  afterAll(() => {
    // Cleanup server
    server.close();
    if (fs.existsSync(testDirectory)) {
      fs.rmSync(testDirectory, { recursive: true });
    }
  });

  it('should handle server connection for hot module replacement', (done) => {
    const options = {
      data: '/test-endpoint',
      onError: (err) => {
        throw err;
      },
      active: true,
      module: { hot: true }
    };

    // Mock the __resourceQuery to simulate server connection
    global.__resourceQuery = encodeURIComponent('http://localhost:8080');
    const cleanup = keepAlive(options);

    // Verify the connection works correctly
    setTimeout(() => {
      console.log = jest.fn(); // Capture logs
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Received update'));
      cleanup(); // Cleanup connection
      done();
    }, 1000);
  });

  it('should handle connection errors gracefully', (done) => {
    const options = {
      data: '/invalid-endpoint',
      onError: (err) => {
        expect(err).toBeDefined();
        expect(err.message).toContain('Problem communicating active modules to the server');
        done();
      },
      active: false,
      module: { hot: false }
    };

    global.__resourceQuery = encodeURIComponent('http://localhost:8080');
    const cleanup = keepAlive(options);

    // Simulate an error by passing an invalid endpoint
    setTimeout(() => {
      cleanup();
    }, 1000);
  });
});
