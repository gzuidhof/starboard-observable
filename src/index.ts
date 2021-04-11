import { CellTypeDefinition, CellHandlerAttachParameters, CellElements, Cell } from "starboard-notebook/dist/src/types";
import { Runtime } from "starboard-notebook/dist/src/runtime";

//@ts-ignore
import compiler from "@alex.garcia/unofficial-observablehq-compiler";
//@ts-ignore
import { Inspector } from "@observablehq/runtime";
import { getRuntime } from "./runtime";
import { CompiledObservableCell, ObservableCompiler, ObservableObserver } from "./types";
import { injectInspectorStyles } from "./global";

declare global {
    interface Window {
      runtime: Runtime
    }
}

export function registerObservable() {
    /* These globals are exposed by Starboard Notebook. We can re-use them so we don't have to bundle them again. */
    const runtime = window.runtime;
    const lithtml = runtime.exports.libraries.LitHtml;
    const StarboardTextEditor = runtime.exports.elements.StarboardTextEditor;

    const OBSERVABLE_CELL_TYPE_DEFINITION: CellTypeDefinition = {
        name: "Observable",
        // @ts-ignore Ignore to be removed after updating typings.
        cellType: ["observable"],
        createHandler: (cell: Cell, runtime: Runtime) => new ObservableCellHandler(cell, runtime),
    }

    injectInspectorStyles();

    const compile = new compiler.Compiler() as ObservableCompiler;
    const observableRuntime = getRuntime();
    const main = observableRuntime.module();

    class ObservableCellHandler {
        private elements!: CellElements;
        private editor: any;
        private changeListener: () => any;

        cell: Cell;
        runtime: Runtime;

        private errorElement!: HTMLElement;
        private observableCell?: CompiledObservableCell;
        private observer!: ObservableObserver;

        constructor(cell: Cell, runtime: Runtime) {
            this.cell = cell;
            this.runtime = runtime;

            this.changeListener = () => this.run();
        }

        attach(params: CellHandlerAttachParameters): void {
            this.elements = params.elements;

            this.errorElement = document.createElement("div");
            this.errorElement.style.color = "red";
            const outputElement = document.createElement("div");
            
            // Set up observable cell
            this.observer = Inspector.into(outputElement);
            const topElement = this.elements.topElement;

            lithtml.render(lithtml.html`${this.errorElement}${outputElement}`, this.elements.bottomElement);

            // TODO: it's not really Javascript.. Observable does offer a Lezer parser for their syntax, so I could
            // support that for the CodeMirror editor, but for Monaco we're out of luck.
            this.editor = new StarboardTextEditor(this.cell, this.runtime, {language: "javascript"});
            topElement.appendChild(this.editor);
            this.runtime.controls.subscribeToCellChanges(this.cell.id, this.changeListener);
            this.run();
        }

        async run() {
            if (this.cell.textContent === "") {
                this.errorElement.innerText = "";
                // An empty cell is not valid for Observable for some reason?
                return;
            }
            try {
                this.errorElement.innerText = "";
                if (!this.observableCell) { // The first time the cell is run this will be undefined
                    this.observableCell = await compile.cell(this.cell.textContent);
                    this.observableCell.define(main, this.observer);
                } else {
                    this.observableCell = await compile.cell(this.cell.textContent);
                    this.observableCell.redefine(main)
                }
            } catch (e) {
                console.error(e);
                this.errorElement.innerText = e.toString();
            }
        }

        focusEditor() {
            this.editor.focus();
        }

        async dispose() {
            this.editor.remove();
        }
    
    }

    runtime.definitions.cellTypes.register(OBSERVABLE_CELL_TYPE_DEFINITION.cellType, OBSERVABLE_CELL_TYPE_DEFINITION);
}
