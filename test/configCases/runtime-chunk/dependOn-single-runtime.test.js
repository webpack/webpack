const { createHash } = require("crypto");
const { readFile } = require("fs").promises;
const { existsSync } = require("fs");
const path = require("path");

describe("RuntimeChunk", () => {
  it("should load split chunks with dependOn and runtimeChunk: 'single'", async () => {
    const distDir = path.join(
      __dirname,
      "../../../temp/dependOn-single-runtime"
    );
    
    const compiler = getCompiler(
      "runtime-chunk/dependOn-single-runtime",
      {},
      {
        output: {
          path: distDir,
        },
      }
    );

    const { stats } = await compile(compiler);
    
    expect(stats.hasErrors()).toBe(false);
    
    // Verify chunks
    const chunks = stats.toJson().chunks;
    const chunkFiles = chunks.map((chunk) => chunk.files[0]);
    
    // Should generate 3 chunks: runtime, lib, main
    expect(chunks).toHaveLength(3);
    
    // Verify runtime chunk exists
    const runtimeChunk = chunks.find((chunk) => chunk.names.includes("runtime"));
    expect(runtimeChunk).toBeTruthy();
    
    // Verify lib chunk doesn't contain runtime
    const libChunk = chunks.find((chunk) => chunk.names.includes("lib"));
    expect(libChunk.files[0]).toMatch(/lib\.\w+\.js$/);
    
    // Verify main chunk doesn't contain runtime
    const mainChunk = chunks.find((chunk) => chunk.names.includes("main"));
    expect(mainChunk.files[0]).toMatch(/main\.\w+\.js$/);
    
    // Verify runtime chunk is separate
    expect(runtimeChunk.files[0]).toMatch(/runtime\.\w+\.js$/);
    
    // Verify runtime is only in the runtime chunk
    const runtimeContent = await readFile(
      path.join(distDir, runtimeChunk.files[0]),
      "utf-8"
    );
    expect(runtimeContent).toContain("webpackRuntime");
    
    // Verify entries work
    const mainContent = await readFile(
      path.join(distDir, mainChunk.files[0]),
      "utf-8"
    );
    expect(mainContent).toContain("console.log('main')");
    
    const libContent = await readFile(
      path.join(distDir, libChunk.files[0]),
      "utf-8"
    );
    expect(libContent).toContain("console.log('lib')");
  });
});