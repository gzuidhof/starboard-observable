// Note(@gzuidhof): These typings are very incomplete.

export type ObservableModule = {
    define(): any
};

export type ObservableObserver = any;

export interface CompiledObservableCell {
    define(module: ObservableModule, observer?: ObservableObserver): void;
    redefine(module: ObservableModule, observer?: ObservableObserver): Promise<void>;
}

export type ObservableCompiler = {
    cell(contents: string): Promise<CompiledObservableCell>;
    module(source: string): ObservableModule;
}

export type ObservableRuntime = {
    module(define?: any, observer?: any): ObservableModule;
    dispose(): any;
}
