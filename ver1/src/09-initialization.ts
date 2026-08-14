/** Группа инициализации: публикация API и единственная точка входа приложения. */
function parseUrlParams(search = window.location.search, hash = window.location.hash): UrlParams {
    const urlParams = new URLSearchParams(hash.length > 1 ? hash.substring(1) : search);
    const params: UrlParams = {};
    const reverseFormatMapping: Record<string, string> = {
        ttl: 'turtle', turtle: 'turtle', nt: 'n-triples', 'n-triples': 'n-triples',
        nq: 'n-quads', 'n-quads': 'n-quads', trig: 'trig'
    };
    const rdf = urlParams.get('rdf');
    const from = urlParams.get('from');
    const to = urlParams.get('to');
    const mode = urlParams.get('mode');

    if (rdf !== null) params.rdf = rdf;
    if (from !== null) params.from = reverseFormatMapping[from] ?? 'turtle';
    if (to === 'svg' || to === 'png') params.to = to;
    if (mode === 'notation' || mode === 'base' || mode === 'aggregation' || mode === 'vad') {
        params.mode = mode;
    }
    return params;
}

function applyUrlParams(params: UrlParams): void {
    if (params.rdf === undefined) return;
    byId<HTMLTextAreaElement>('rdf-input').value = params.rdf;
    if (params.from) byId<HTMLSelectElement>('input-format').value = params.from;
    if (params.to) byId<HTMLSelectElement>('output-format').value = params.to;
    if (params.mode) byId<HTMLSelectElement>('visualization-mode').value = params.mode;
    updateModeDescription();
    window.setTimeout(() => void RdfGrapher.workflow.visualize(), 100);
}

function publishGroup(group: string, api: Record<string, any>): void {
    const instrumented = Logging.instrument(group, api);
    RdfGrapher[group] = instrumented;
    Object.assign(window, instrumented);
}

function main(): void {
    RdfGrapher.logging = { clear: Logging.clear, write: Logging.write };

    publishGroup('examples', { loadExampleTurtle, loadExampleVAD, loadExampleNTriples,
        loadExampleNQuads, loadExampleTriG, loadExample });
    publishGroup('conversion', { rdfToDotVAD, rdfToDotAggregation, rdfToDot });
    publishGroup('interface', { applyZoom, zoomIn, zoomOut, zoomReset, zoomFit,
        closePropertiesPanel, closeAllPropertiesPanels, showNodeProperties,
        startDragPanel, selectAllFilters, deselectAllFilters, togglePredicateFilter,
        revisualize, updateModeDescription, toggleSparqlPanel });
    publishGroup('workflow', { visualize, downloadSVG, downloadPNG, openInNewWindowLdfFi,
        openInNewWindowGitHub, openInNewWindowGraphvizOnline });
    publishGroup('sparql', { executeSparqlQuery, highlightNodeFromSparqlResult, resetSparqlQuery });
    publishGroup('initialization', { applyUrlParams });

    window.RdfGrapher = RdfGrapher;
    updateModeDescription();
    applyUrlParams(parseUrlParams());
    Logging.write({ timestamp: new Date().toLocaleTimeString(), group: 'initialization',
        functionName: 'main', status: 'успех' });
}

RdfGrapher.core = { getLocalName, getPrefixedName, escapeDotString, generateNodeId,
    generateVadNodeId, isNameOrLabelPredicate, escapeHtmlLabel, escapeHtml,
    wrapTextByWords, formatLabelWithWrap, parseUrlParams };
RdfGrapher.validation = { validateVAD, formatVADErrors };
(globalThis as any).RdfGrapher = RdfGrapher;
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', main);
