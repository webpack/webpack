
    const { parentPort } = require('worker_threads');
    globalThis.self = globalThis;
    self.postMessage = parentPort.postMessage.bind(parentPort);
    self.onmessage = null;
    parentPort.on('message', (data) => {
        if (self.onmessage) self.onmessage({ data });
    });
    require('./main.js');
    