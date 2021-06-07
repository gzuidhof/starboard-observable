// Note(@gzuidhof): These typings are very incomplete.

export type ObservableModule = {
  define(): any;
};

export type ObservableObserver = any;

export interface CompiledObservableCell {
  define(module: ObservableModule, observer?: ObservableObserver): void;
  redefine(module: ObservableModule, observer?: ObservableObserver): Promise<void>;
}

export type ObservableInterpreter = {
  new (params: { module: ObservableModule; observer: ObservableObserver } & any): ObservableInterpreter;
  cell(code: string, module: null | ObservableModule, observer?: ObservableObserver): Promise<any>;
};

export type ObservableCompiler = {
  cell(contents: string): Promise<CompiledObservableCell>;
  module(source: string): ObservableModule;
};

export type ObservableVariable = {
  delete(): void;
  _observer: any;
};

export type ObservableRuntime = {
  module(define?: any, observer?: any): ObservableModule;
  dispose(): any;
};
