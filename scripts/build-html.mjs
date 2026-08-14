import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = 'ver1/original/index.html';
const targetPath = 'ver1/index.html';
const source = await readFile(sourcePath, 'utf8');
const appPath = 'ver1/dist/app.js';
let app = await readFile(appPath, 'utf8');

const functionsByGroup = {
    validation: ['getFilterConfig', 'validateVAD', 'formatVADErrors'],
    'examples/core': ['loadExampleTurtle', 'loadExampleVAD', 'loadExampleNTriples', 'loadExampleNQuads',
        'loadExampleTriG', 'loadExample', 'getLocalName', 'getPrefixedName', 'escapeDotString',
        'generateNodeId', 'generateVadNodeId', 'isNameOrLabelPredicate', 'escapeHtmlLabel',
        'escapeHtml', 'wrapTextByWords', 'formatLabelWithWrap'],
    interface: ['getNodeStyle', 'getEdgeStyle', 'buildNodeTypesCache', 'applyZoom', 'zoomIn', 'zoomOut',
        'zoomReset', 'zoomFit', 'closePropertiesPanel', 'closeAllPropertiesPanels', 'getNodeProperties',
        'showNodeProperties', 'bringPanelToFront', 'startDragPanel', 'dragPanel', 'stopDragPanel',
        'addNodeClickHandlers', 'handleNodeClick', 'isPredicateHidden', 'displayFilters',
        'togglePredicateFilter', 'selectAllFilters', 'deselectAllFilters', 'revisualize'],
    conversion: ['rdfToDotVAD', 'rdfToDotAggregation', 'rdfToDot'],
    view: ['showLoading', 'showError', 'showValidationError', 'displayPrefixes', 'displayLegend',
        'updateModeDescription', 'toggleSparqlPanel'],
    workflow: ['visualize', 'svgToPng', 'downloadSVG', 'downloadPNG', 'openInNewWindowLdfFi',
        'openInNewWindowGitHub', 'openInNewWindowGraphvizOnline'],
    sparql: ['initSparqlEngine', 'executeSparqlQuery', 'highlightNodeFromSparqlResult', 'resetSparqlQuery'],
    initialization: ['parseUrlParams', 'applyUrlParams', 'publishGroup', 'main']
};
for (const [group, names] of Object.entries(functionsByGroup)) {
    for (const name of names) {
        const pattern = new RegExp(`(^|\\n)(\\s*)(async\\s+)?function\\s+${name}\\s*\\(([^)]*)\\)\\s*\\{`);
        if (!pattern.test(app)) throw new Error(`Не найдена функция ${name}`);
        app = app.replace(pattern, (_match, newline, indent, asyncKeyword = '', args) =>
            `${newline}${indent}${asyncKeyword}function ${name}(${args}) {\n${indent}    Logging.entered('${group}', '${name}');`
        );
    }
}
await writeFile(appPath, app);

const logStyles = `
        .execution-log-panel {
            margin-top: 20px;
            padding: 15px;
            color: #e8f5e9;
            background: #263238;
            border-radius: 8px;
        }
        .execution-log-header { display: flex; justify-content: space-between; align-items: center; }
        .execution-log-header h3 { margin: 0; }
        .execution-log-header button { margin: 0; padding: 6px 12px; font-size: 12px; }
        #execution-log {
            height: 180px;
            margin-top: 10px;
            padding: 10px;
            overflow: auto;
            color: #cfd8dc;
            background: #1b2428;
            font-family: Consolas, Monaco, monospace;
            font-size: 12px;
            white-space: pre-wrap;
        }
        .log-ошибка { color: #ff8a80; }
        .log-успех { color: #b9f6ca; }
`;

const logMarkup = `
    <section class="execution-log-panel" aria-labelledby="execution-log-title">
        <div class="execution-log-header">
            <h3 id="execution-log-title">Журнал выполнения функций</h3>
            <button type="button" onclick="RdfGrapher.logging.clear()">Очистить</button>
        </div>
        <div id="execution-log" role="log" aria-live="polite"></div>
    </section>
`;

const inlineScript = /\n    <script>\n[\s\S]*?\n    <\/script>\n<\/body>/;
const html = source
    .replace('    </style>', `${logStyles}    </style>`)
    .replace('    <script src="https://unpkg.com/n3@1.17.2/browser/n3.min.js"></script>', `${logMarkup}\n    <script src="https://unpkg.com/n3@1.17.2/browser/n3.min.js"></script>`)
    .replace(inlineScript, '\n    <script src="dist/app.js"></script>\n</body>');

if (html === source || html.includes('Основной JavaScript модуль')) {
    throw new Error('Не удалось заменить исходный inline JavaScript');
}
await writeFile(targetPath, html);
