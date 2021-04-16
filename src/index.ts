import { CellTypeDefinition, CellHandlerAttachParameters, CellElements, Cell } from "starboard-notebook/dist/src/types";
import { ControlButton, Runtime } from "starboard-notebook/dist/src/runtime";

//@ts-ignore
import ucompiler from "@alex.garcia/unofficial-observablehq-compiler";
//@ts-ignore
import { Inspector } from "@observablehq/runtime";
import { getRuntime } from "./runtime";
import { ObservableObserver, ObservableInterpreter, ObservableVariable } from "./types";
import { injectInspectorStyles } from "./global";
import { hasParentWithId } from "./util";

declare global {
    interface Window {
      runtime: Runtime
    }
}

export function registerObservablePlugin() {
    /* These globals are exposed by Starboard Notebook. We can re-use them so we don't have to bundle them again. */
    const runtime = window.runtime;
    const lithtml = runtime.exports.libraries.LitHtml;
    const StarboardTextEditor = runtime.exports.elements.StarboardTextEditor;
    const cellControlsTemplate = runtime.exports.templates.cellControls;
    const icons = runtime.exports.templates.icons;

    const OBSERVABLE_CELL_TYPE_DEFINITION: CellTypeDefinition = {
        name: "Observable",
        // @ts-ignore Ignore to be removed after updating typings.
        cellType: ["observable"],
        createHandler: (cell: Cell, runtime: Runtime) => new ObservableCellHandler(cell, runtime),
    }

    injectInspectorStyles();

    // const compile = new compiler.Compiler() as ObservableCompiler;
    const observableRuntime = getRuntime();
    const main = observableRuntime.module();
    const interpreter = new ucompiler.Interpreter({ module: main}) as ObservableInterpreter;

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
                    this.renderControls();
                }
                else if (!this.hasUnevaluatedChanges && this.lastEvaluatedContent !== this.cell.textContent) {
                    this.hasUnevaluatedChanges = true;
                    this.renderControls();
                }
            };
        }

        private renderControls() {
            let buttons: ControlButton[] = [];

            if (this.hasUnevaluatedChanges) {
                const runButton: ControlButton = {
                    icon: icons.PlayCircleIcon,
                    tooltip: "Evaluate Cell",
                    callback: () => this.runtime.controls.emit({id: this.cell.id, type: "RUN_CELL"}),
                }
                buttons = [runButton];
            }
            lithtml.render(cellControlsTemplate({ buttons }), this.elements.bottomControlsElement);
        }

        attach(params: CellHandlerAttachParameters): void {
            this.elements = params.elements;

            this.errorElement = document.createElement("div");
            const outputElement = document.createElement("div");
            
            // Set up observable cell
            this.observer = Inspector.into(outputElement);

            this.elements.topElement.style.minHeight = "0";
            lithtml.render(lithtml.html`${this.errorElement}${outputElement}`, this.elements.topElement);

            // TODO: it's not really Javascript.. Observable does offer a Lezer parser for their syntax, so I could
            // support that for the CodeMirror editor, but for Monaco we're out of luck.
            this.editor = new StarboardTextEditor(this.cell, this.runtime, {language: "javascript"});
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
        }

        private cleanupVariables() {
            for (const v of this.variables) {
                v.delete();
                if (v._observer._node) {
                    v._observer._node.remove();
                }
            }
        }

        async run() {
            this.lastEvaluatedContent = this.cell.textContent;
            if (this.hasUnevaluatedChanges) {
                this.hasUnevaluatedChanges = false;
                this.renderControls();
            }

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
                this.errorElement.innerHTML = `<div class="observablehq observablehq--error"><div class="observablehq--inspect">${e.toString()}</div></div>`
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
