import {
  CellTypeDefinition,
  CellHandlerAttachParameters,
  CellElements,
  Cell,
  ControlButton,
} from "starboard-notebook/dist/src/types/core";
import { Runtime } from "starboard-notebook/dist/src/types/runtime";

//@ts-ignore
import ucompiler from "@alex.garcia/unofficial-observablehq-compiler";
//@ts-ignore
import { Inspector } from "@observablehq/runtime";
import { getRuntime } from "./runtime";
import { ObservableObserver, ObservableInterpreter, ObservableVariable } from "./types";
import { injectInspectorStyles } from "./global";
import { hasParentWithId } from "./util";
import { PinOffIcon, PinOnIcon } from "./icons";
import { StarboardPlugin } from "starboard-notebook/dist/src/types";

declare global {
  interface Window {
    runtime: Runtime;
  }
}

function registerObservablePlugin() {
  /* These globals are exposed by Starboard Notebook. We can re-use them so we don't have to bundle them again. */
  const runtime = window.runtime;
  const lit = runtime.exports.libraries.lit;
  const StarboardTextEditor = runtime.exports.elements.StarboardTextEditor;
  const cellControlsTemplate = runtime.exports.templates.cellControls;

  const OBSERVABLE_CELL_TYPE_DEFINITION: CellTypeDefinition = {
    name: "Observable",
    // @ts-ignore Ignore to be removed after updating typings.
    cellType: ["observable"],
    createHandler: (cell: Cell, runtime: Runtime) => new ObservableCellHandler(cell, runtime),
  };

  injectInspectorStyles();

  // const compile = new compiler.Compiler() as ObservableCompiler;
  const observableRuntime = getRuntime();
  const main = observableRuntime.module();
  const interpreter = new ucompiler.Interpreter({ module: main, observeViewofValues: false }) as ObservableInterpreter;

  class ObservableCellHandler {
    private elements!: CellElements;
    private editor: any;
    private changeListener: () => any;
    private variables: ObservableVariable[] = [];

    private lastEvaluatedContent: string = "";
    private hasUnevaluatedChanges: boolean = false;

    cell: Cell;
    runtime: Runtime;

    private errorElement!: HTMLElement;
    private observer!: ObservableObserver;

    constructor(cell: Cell, runtime: Runtime) {
      this.cell = cell;
      this.runtime = runtime;

      this.changeListener = () => {
        if (this.hasUnevaluatedChanges && this.lastEvaluatedContent === this.cell.textContent) {
          this.hasUnevaluatedChanges = false;
          // TODO: move this check elsewhere
          if (this.elements) {
            this.elements.bottomElement.classList.toggle("is-empty", !this.cell.textContent);
            this.elements.bottomControlsElement.classList.toggle("is-empty", !this.cell.textContent);
          }
          this.renderControls();
        } else if (!this.hasUnevaluatedChanges && this.lastEvaluatedContent !== this.cell.textContent) {
          this.hasUnevaluatedChanges = true;
          // TODO: move this check elsewhere
          if (this.elements) {
            this.elements.bottomElement.classList.toggle("is-empty", !this.cell.textContent);
            this.elements.bottomControlsElement.classList.toggle("is-empty", !this.cell.textContent);
          }
          this.renderControls();
        }
      };

      this.changeListener();
    }

    private renderControls() {
      if (!this.elements) return;
      let buttons: ControlButton[] = [];

      const isPinned = this.elements.bottomElement.classList.contains("pinned");
      const pinButton: ControlButton = {
        icon: isPinned ? PinOnIcon : PinOffIcon,
        tooltip: isPinned ? "Unpin (hide when cell is not focused)" : "Pin (display when cell is not focused)",
        callback: () => {
          this.elements.bottomElement.classList.toggle("pinned");
          this.elements.bottomControlsElement.classList.toggle("pinned");
          this.renderControls();
        },
      };
      const runButton: ControlButton = {
        icon: "bi bi-play-circle",
        tooltip: "Evaluate Cell",
        callback: () => this.runtime.controls.runCell({ id: this.cell.id }),
      };
      buttons = [pinButton, runButton];

      lit.render(cellControlsTemplate({ buttons }), this.elements.bottomControlsElement);
    }

    attach(params: CellHandlerAttachParameters): void {
      this.elements = params.elements;

      this.errorElement = document.createElement("div");
      const outputElement = document.createElement("div");

      // Set up observable cell
      this.observer = Inspector.into(outputElement);

      this.elements.topElement.style.minHeight = "0";
      lit.render(lit.html`${this.errorElement}${outputElement}`, this.elements.topElement);

      // TODO: it's not really Javascript.. Observable does offer a Lezer parser for their syntax, so I could
      // support that for the CodeMirror editor, but for Monaco we're out of luck.
      this.editor = new StarboardTextEditor(this.cell, this.runtime, { language: "javascript" });
      this.elements.bottomElement.appendChild(this.editor);
      this.run();

      this.runtime.controls.subscribeToCellChanges(this.cell.id, this.changeListener);
      // Hacky run on focus out, to be improved
      this.elements.topElement.parentElement!.addEventListener("focusout", (event: FocusEvent) => {
        if (!event.relatedTarget || !hasParentWithId(event.relatedTarget as HTMLElement, this.cell.id)) {
          if (this.hasUnevaluatedChanges) {
            this.run();
          }
        }
      });

      if (this.elements) {
        this.elements.bottomElement.classList.toggle("is-empty", !this.cell.textContent);
        this.elements.bottomControlsElement.classList.toggle("is-empty", !this.cell.textContent);
      }
    }

    private cleanupVariables() {
      for (const v of this.variables) {
        v.delete();
        if (v._observer._node) {
          v._observer._node.remove();
        }
      }
    }

    clear() {}

    async run() {
      this.renderControls();
      this.lastEvaluatedContent = this.cell.textContent;
      this.hasUnevaluatedChanges = false;

      this.cleanupVariables();
      if (this.cell.textContent === "") {
        this.errorElement.innerHTML = "";
        // An empty cell is not valid in Observable, so we just do nothing..
        return;
      }
      try {
        this.errorElement.innerHTML = "";
        this.variables = await interpreter.cell(this.cell.textContent, main, this.observer);
      } catch (e) {
        console.error(e);
        // TODO render this using lit-html or something
        this.errorElement.innerHTML = `<div class="observablehq observablehq--error"><div class="observablehq--inspect">${e.toString()}</div></div>`;
        if (this.observer._node) {
          this.observer._node.remove();
        }
      }
    }

    focusEditor() {
      if (this.editor) this.editor.focus();
    }

    async dispose() {
      this.runtime.controls.unsubscribeToCellChanges(this.cell.id, this.changeListener);
      this.editor.remove();
      this.cleanupVariables();
    }
  }

  runtime.definitions.cellTypes.register(OBSERVABLE_CELL_TYPE_DEFINITION.cellType, OBSERVABLE_CELL_TYPE_DEFINITION);
}

export const plugin: StarboardPlugin = {
  id: "starboard-observable",
  metadata: {
    name: "Starboard Observable",
  },
  exports: {},
  async register(runtime: Runtime, opts: {} = {}) {
    registerObservablePlugin();
  },
};
