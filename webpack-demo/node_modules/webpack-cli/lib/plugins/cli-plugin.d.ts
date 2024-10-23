import { type Compiler } from "webpack";
import { type CLIPluginOptions } from "../types";
export declare class CLIPlugin {
    #private;
    logger: ReturnType<Compiler["getInfrastructureLogger"]>;
    options: CLIPluginOptions;
    constructor(options: CLIPluginOptions);
    setupBundleAnalyzerPlugin(compiler: Compiler): Promise<void>;
    setupProgressPlugin(compiler: Compiler): void;
    setupHelpfulOutput(compiler: Compiler): void;
    apply(compiler: Compiler): void;
}
