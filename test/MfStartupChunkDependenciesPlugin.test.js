// __tests__/MfStartupChunkDependenciesPlugin.test.js
const webpack = require('webpack');
const MfStartupChunkDependenciesPlugin = require('../path/to/MfStartupChunkDependenciesPlugin'); // Adjust path as needed

describe('MfStartupChunkDependenciesPlugin', () => {
  let compiler;
  let mockSet;
  let mockChunk;
  let mockChunkGraph;

  beforeEach(() => {
    // Mock the chunk and chunkGraph for testing
    mockSet = new Set();
    mockChunk = {
      id: 'test-chunk',
    };
    mockChunkGraph = {
      getNumberOfEntryModules: jest.fn(() => 1),
    };

    // Mock the isEnabledForChunk method if needed
    global.isEnabledForChunk = jest.fn(() => true);

    // Create a new compiler instance with the plugin
    compiler = webpack({
      entry: './src/index.js', // Adjust to your entry point
      output: {
        path: __dirname + '/dist',
        filename: 'bundle.js',
      },
      plugins: [new MfStartupChunkDependenciesPlugin()],
    });
  });

  it('should add federationStartup to the runtime requirements', () => {
    // Simulate the webpack compilation hook
    const compilation = {
      hooks: {
        additionalChunkRuntimeRequirements: {
          tap: jest.fn((pluginName, callback) => {
            callback(mockChunk, mockSet, { chunkGraph: mockChunkGraph });
          }),
        },
      },
    };

    // Simulate the plugin's effect on the compilation
    const plugin = new MfStartupChunkDependenciesPlugin();
    plugin.apply({
      hooks: {
        compilation: {
          tap: (pluginName, callback) => callback(compilation),
        },
      },
    });

    // Assert that the runtime requirement (federationStartup) is added
    expect(mockSet.has('federationStartup')).toBe(true);
  });

  it('should not add federationStartup if the chunk has no entry modules', () => {
    mockChunkGraph.getNumberOfEntryModules.mockReturnValueOnce(0); // Simulate no entry modules

    const compilation = {
      hooks: {
        additionalChunkRuntimeRequirements: {
          tap: jest.fn((pluginName, callback) => {
            callback(mockChunk, mockSet, { chunkGraph: mockChunkGraph });
          }),
        },
      },
    };

    const plugin = new MfStartupChunkDependenciesPlugin();
    plugin.apply({
      hooks: {
        compilation: {
          tap: (pluginName, callback) => callback(compilation),
        },
      },
    });

    expect(mockSet.has('federationStartup')).toBe(false); // It should not add the runtime requirement
  });
});
