// @ts-ignore
import { Runtime } from "@observablehq/runtime";
import { ObservableRuntime } from "./types";

// Global singleton Observable runtime
const runtime = new Runtime();

export function getRuntime(): ObservableRuntime {
  return runtime;
}
