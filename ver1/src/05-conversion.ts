        // @ts-nocheck — алгоритмы DOT перенесены дословно; входные RDF-контракты заданы в 00-types.ts.
        function rdfToDotVAD(quads, prefixes = {}) {
            buildNodeTypesCache(currentQuads, prefixes);
            nodeLabelToUri = {};

            // Собираем информацию о процессах и их исполнителях
            const processes = new Map();  // URI процесса -> информация
            const executorGroups = new Map();  // URI группы -> список исполнителей
            const hasNextEdges = [];  // Связи hasNext между процессами

            // Первый проход: собираем все объекты
            quads.forEach(quad => {
                const subjectUri = quad.subject.value;
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);
                const objectValue = quad.object.value;

                // Проверяем типы
                const subjectTypes = nodeTypesCache[subjectUri] || [];
                const isProcess = subjectTypes.some(t =>
                    t === 'vad:Process' || t === 'http://example.org/vad#Process'
                );

                if (isProcess) {
                    if (!processes.has(subjectUri)) {
                        processes.set(subjectUri, {
                            uri: subjectUri,
                            label: getPrefixedName(subjectUri, prefixes),
                            name: null,
                            executorGroup: null,
                            hasNext: [],
                            hasParent: null
                        });
                    }

                    const processInfo = processes.get(subjectUri);

                    // Собираем rdfs:label для имени
                    if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                        processInfo.name = objectValue;
                    }

                    // Собираем hasExecutor
                    if (predicateLabel === 'vad:hasExecutor' || predicateUri === 'http://example.org/vad#hasExecutor') {
                        processInfo.executorGroup = objectValue;
                    }

                    // Собираем hasNext
                    if (predicateLabel === 'vad:hasNext' || predicateUri === 'http://example.org/vad#hasNext') {
                        processInfo.hasNext.push(objectValue);
                        hasNextEdges.push({ from: subjectUri, to: objectValue });
                    }

                    // Собираем hasParent
                    if (predicateLabel === 'vad:hasParent' || predicateUri === 'http://example.org/vad#hasParent') {
                        processInfo.hasParent = objectValue;
                    }
                }

                // Собираем информацию о группах исполнителей
                const isExecutorGroup = subjectTypes.some(t =>
                    t === 'vad:ExecutorGroup' || t === 'http://example.org/vad#ExecutorGroup'
                );

                if (isExecutorGroup) {
                    if (!executorGroups.has(subjectUri)) {
                        executorGroups.set(subjectUri, {
                            uri: subjectUri,
                            label: null,
                            executors: []
                        });
                    }

                    const groupInfo = executorGroups.get(subjectUri);

                    if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                        groupInfo.label = objectValue;
                    }

                    if (predicateLabel === 'vad:includes' || predicateUri === 'http://example.org/vad#includes') {
                        groupInfo.executors.push(objectValue);
                    }
                }
            });

            // Собираем имена исполнителей
            const executorNames = new Map();
            quads.forEach(quad => {
                const subjectUri = quad.subject.value;
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);
                const objectValue = quad.object.value;

                const subjectTypes = nodeTypesCache[subjectUri] || [];
                const isExecutor = subjectTypes.some(t =>
                    t === 'vad:Executor' || t === 'http://example.org/vad#Executor'
                );

                if (isExecutor && (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label')) {
                    executorNames.set(subjectUri, objectValue);
                }
            });

            // Генерация DOT-кода
            // Используем rankdir=TB чтобы rank=same группировал узлы горизонтально
            // А процессы идут в одной строке благодаря rank=same
            let dot = 'digraph VADGraph {\n';
            dot += '    // VAD (Value Added Chain Diagram)\n';
            dot += '    rankdir=TB;\n';  // Top-to-bottom позволяет горизонтальное выравнивание через rank=same
            dot += '    node [fontname="Arial"];\n';
            dot += '    edge [fontname="Arial", fontsize=10];\n';
            dot += '    splines=spline;\n';  // spline для лучшей маршрутизации skip-ребер
            dot += '    nodesep=0.8;\n';  // Расстояние между узлами
            dot += '    ranksep=0.3;\n';  // Минимальное расстояние между рангами (CDS и ExecutorGroup)
            dot += '\n';

            // Фильтруем процессы - показываем только те, которые не являются материнскими
            // (Process0 скрыт, потому что он не имеет hasNext и является родителем)
            const visibleProcesses = new Map();
            processes.forEach((processInfo, uri) => {
                // Показываем процесс, если он имеет hasNext или на него ссылается hasNext
                const hasOutgoingNext = processInfo.hasNext.length > 0;
                const hasIncomingNext = [...processes.values()].some(p => p.hasNext.includes(uri));

                if (hasOutgoingNext || hasIncomingNext) {
                    visibleProcesses.set(uri, processInfo);
                }
            });

            // Строим порядок процессов для определения skip-ребер (ребер, которые пропускают промежуточные узлы)
            // Топологическая сортировка процессов по hasNext для определения их порядка
            const processOrder = [];
            const visited = new Set();
            const processUris = [...visibleProcesses.keys()];

            // Найти начальный процесс (процесс без входящих hasNext)
            const incomingCount = new Map();
            processUris.forEach(uri => incomingCount.set(uri, 0));
            hasNextEdges.forEach(edge => {
                if (visibleProcesses.has(edge.to)) {
                    incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
                }
            });

            // Топологическая сортировка (BFS)
            const queue = [];
            processUris.forEach(uri => {
                if (incomingCount.get(uri) === 0) {
                    queue.push(uri);
                }
            });

            while (queue.length > 0) {
                const uri = queue.shift();
                if (!visited.has(uri)) {
                    visited.add(uri);
                    processOrder.push(uri);
                    const processInfo = visibleProcesses.get(uri);
                    if (processInfo) {
                        processInfo.hasNext.forEach(nextUri => {
                            if (visibleProcesses.has(nextUri)) {
                                const count = incomingCount.get(nextUri) - 1;
                                incomingCount.set(nextUri, count);
                                if (count === 0 && !visited.has(nextUri)) {
                                    queue.push(nextUri);
                                }
                            }
                        });
                    }
                }
            }

            // Добавляем оставшиеся процессы (на случай циклов или изолированных)
            processUris.forEach(uri => {
                if (!visited.has(uri)) {
                    processOrder.push(uri);
                }
            });

            // Создаем индекс позиции процесса для определения skip-ребер
            const processPositionIndex = new Map();
            processOrder.forEach((uri, index) => {
                processPositionIndex.set(uri, index);
            });

            // Добавляем узлы процессов (CDS) и ExecutorGroup как отдельные узлы
            dot += '    // Процессы VAD (cds shape) и ExecutorGroup (ellipse желтый)\n';

            // Сначала добавляем все узлы CDS
            visibleProcesses.forEach((processInfo, uri) => {
                const nodeId = generateVadNodeId(uri, prefixes);
                const processName = processInfo.name || processInfo.label;

                // Формируем HTML label с именем процесса (БЕЗ жирного шрифта)
                const wrappedProcessName = wrapTextByWords(processName, currentMaxLabelLength);

                let htmlLabel = '<';
                for (let i = 0; i < wrappedProcessName.length; i++) {
                    if (i > 0) htmlLabel += '<BR/>';
                    htmlLabel += escapeHtmlLabel(wrappedProcessName[i]);
                }
                htmlLabel += '>';

                // cds shape с зеленой заливкой
                let nodeStyle = 'shape="cds" color="#2E7D32" fillcolor="#A5D6A7" fontname="Arial" fontsize="11" style="filled"';
                dot += `    ${nodeId} [label=${htmlLabel} ${nodeStyle}];\n`;

                nodeLabelToUri[processInfo.label] = { uri: uri, dotId: nodeId };
            });

            dot += '\n';

            // Добавляем ExecutorGroup узлы (желтые эллипсы)
            // ExecutorGroup объекты теперь кликабельны и показывают свойства
            dot += '    // ExecutorGroup узлы (эллипсы с желтоватой заливкой)\n';
            visibleProcesses.forEach((processInfo, uri) => {
                const nodeId = generateVadNodeId(uri, prefixes);

                // Получаем список исполнителей
                let executorsList = '';
                let executorGroupUri = null;
                if (processInfo.executorGroup && executorGroups.has(processInfo.executorGroup)) {
                    executorGroupUri = processInfo.executorGroup;
                    const group = executorGroups.get(processInfo.executorGroup);
                    const executorNamesList = group.executors.map(exUri =>
                        executorNames.get(exUri) || getPrefixedName(exUri, prefixes)
                    );
                    executorsList = executorNamesList.join(', ');
                }

                if (executorsList && executorGroupUri) {
                    const executorNodeId = `${nodeId}_exec`;
                    const wrappedExecutors = wrapTextByWords(executorsList, currentMaxLabelLength);

                    let execLabel = '<<FONT POINT-SIZE="9">';
                    for (let i = 0; i < wrappedExecutors.length; i++) {
                        if (i > 0) execLabel += '<BR/>';
                        execLabel += escapeHtmlLabel(wrappedExecutors[i]);
                    }
                    execLabel += '</FONT>>';

                    // ExecutorGroup как эллипс с желтоватой заливкой
                    dot += `    ${executorNodeId} [label=${execLabel} shape="ellipse" color="#B8860B" fillcolor="#FFFFCC" fontname="Arial" style="filled"];\n`;

                    // Регистрируем ExecutorGroup для кликабельности (показ свойств объекта)
                    const executorGroupLabel = getPrefixedName(executorGroupUri, prefixes);
                    nodeLabelToUri[executorGroupLabel] = { uri: executorGroupUri, dotId: executorNodeId };
                }
            });

            dot += '\n';

            // Собираем ID узлов для rank constraints, используя порядок из topological sort
            const cdsNodeIds = [];
            const execNodeIds = [];
            const nodeIdToUri = new Map();  // Обратное отображение для быстрого поиска

            // Используем отсортированный порядок процессов
            processOrder.forEach(uri => {
                if (visibleProcesses.has(uri)) {
                    const processInfo = visibleProcesses.get(uri);
                    const nodeId = generateVadNodeId(uri, prefixes);
                    cdsNodeIds.push(nodeId);
                    nodeIdToUri.set(nodeId, uri);

                    if (processInfo.executorGroup && executorGroups.has(processInfo.executorGroup)) {
                        const group = executorGroups.get(processInfo.executorGroup);
                        if (group.executors.length > 0) {
                            execNodeIds.push(`${nodeId}_exec`);
                        }
                    }
                }
            });

            // Разбиваем процессы на строки по currentMaxVadRowLength
            const rows = [];
            for (let i = 0; i < cdsNodeIds.length; i += currentMaxVadRowLength) {
                rows.push(cdsNodeIds.slice(i, i + currentMaxVadRowLength));
            }

            // Собираем соответствующие execNodeIds для каждой строки
            // Важно: execNodeIds должны соответствовать позициям cdsNodeIds
            const execRows = [];
            rows.forEach((rowCdsIds, rowIndex) => {
                const rowExecIds = [];
                rowCdsIds.forEach(cdsId => {
                    const execId = `${cdsId}_exec`;
                    if (execNodeIds.includes(execId)) {
                        rowExecIds.push(execId);
                    }
                });
                execRows.push(rowExecIds);
            });

            // Генерация rank constraints для каждой строки
            dot += '    // Rank constraints для CDS строк и ExecutorGroup строк\n';
            rows.forEach((rowCdsIds, rowIndex) => {
                // CDS строка
                dot += `    { rank=same; ${rowCdsIds.join('; ')}; }\n`;
            });

            // Генерация rank constraints для ExecutorGroup строк
            execRows.forEach((rowExecIds, rowIndex) => {
                if (rowExecIds.length > 0) {
                    dot += `    { rank=same; ${rowExecIds.join('; ')}; }\n`;
                }
            });

            // Добавляем невидимые ребра между строками для правильного разделения рядов
            // Это необходимо для того, чтобы Graphviz разместил строки одну под другой
            // FIX issue #60: Связываем ПЕРВЫЙ CDS текущей строки с ПЕРВЫМ CDS следующей строки
            // для выравнивания всех строк по левому краю (как требуется в issue #60)
            dot += '\n    // Невидимые ребра между строками для разделения рядов и выравнивания по левому краю\n';
            for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex++) {
                const currentRowCdsIds = rows[rowIndex];
                const nextRowCdsIds = rows[rowIndex + 1];

                if (currentRowCdsIds.length > 0 && nextRowCdsIds.length > 0) {
                    // Связываем ПЕРВЫЙ CDS текущей строки с ПЕРВЫМ CDS следующей строки
                    // Это выравнивает все строки по левому краю (issue #60)
                    const firstCurrentCdsId = currentRowCdsIds[0];
                    const firstNextCdsId = nextRowCdsIds[0];
                    dot += `    ${firstCurrentCdsId} -> ${firstNextCdsId} [style=invis weight=100 minlen=2];\n`;
                }
            }
            dot += '\n';

            // Добавляем видимые связи vad:hasExecutor между CDS и ExecutorGroup
            dot += '    // Связи vad:hasExecutor - видимые ребра от процессов к группам исполнителей\n';
            visibleProcesses.forEach((processInfo, uri) => {
                const nodeId = generateVadNodeId(uri, prefixes);

                let hasExecutorGroup = false;
                if (processInfo.executorGroup && executorGroups.has(processInfo.executorGroup)) {
                    const group = executorGroups.get(processInfo.executorGroup);
                    hasExecutorGroup = group.executors.length > 0;
                }

                if (hasExecutorGroup) {
                    const executorNodeId = `${nodeId}_exec`;
                    // Видимая связь vad:hasExecutor (синяя пунктирная, ненаправленная)
                    dot += `    ${nodeId} -> ${executorNodeId} [color="#1565C0" penwidth="1" style="dashed" arrowhead="none" weight=10];\n`;
                }
            });

            dot += '\n';

            // Добавляем ребра hasNext между процессами
            // Все ребра hasNext используют порты East -> West (выход справа, вход слева) согласно issue #58
            dot += '    // Связи hasNext - горизонтальный поток процессов (East -> West)\n';

            // Добавляем все ребра hasNext
            hasNextEdges.forEach(edge => {
                // Проверяем, что оба процесса видимы
                if (visibleProcesses.has(edge.from) && visibleProcesses.has(edge.to)) {
                    const fromId = generateVadNodeId(edge.from, prefixes);
                    const toId = generateVadNodeId(edge.to, prefixes);

                    // Все ребра hasNext используют порты East -> West (выход справа, вход слева)
                    // Это обеспечивает единообразное направление связей согласно требованиям issue #58
                    dot += `    ${fromId}:e -> ${toId}:w [color="#2E7D32" penwidth="1" style="solid" arrowhead="vee"];\n`;
                }
            });

            dot += '}\n';

            return dot;
        }

        function rdfToDotAggregation(quads, prefixes = {}) {
            buildNodeTypesCache(currentQuads, prefixes);
            nodeLabelToUri = {};

            const nodes = new Map();
            const edges = [];
            const nodeLiterals = new Map();

            quads.forEach(quad => {
                const subject = quad.subject;
                const predicate = quad.predicate;
                const object = quad.object;

                const subjectValue = subject.value;
                const predicateValue = predicate.value;
                const objectValue = object.value;

                const subjectLabel = getPrefixedName(subjectValue, prefixes);
                const predicateLabel = getPrefixedName(predicateValue, prefixes);

                if (!nodes.has(subjectValue)) {
                    const nodeId = generateNodeId(subjectValue);
                    nodes.set(subjectValue, {
                        id: nodeId,
                        label: subjectLabel,
                        value: subjectValue,
                        isUri: subject.termType === 'NamedNode',
                        isBlank: subject.termType === 'BlankNode',
                        isLiteral: false
                    });
                    nodeLabelToUri[subjectLabel] = { uri: subjectValue, dotId: nodeId };
                    nodeLiterals.set(subjectValue, []);
                }

                if (object.termType === 'Literal') {
                    const literals = nodeLiterals.get(subjectValue);
                    literals.push({
                        predicate: predicateLabel,
                        value: objectValue,
                        isNameLabel: isNameOrLabelPredicate(predicateLabel)
                    });
                } else {
                    const objectLabel = getPrefixedName(objectValue, prefixes);
                    if (!nodes.has(objectValue)) {
                        const nodeId = generateNodeId(objectValue);
                        nodes.set(objectValue, {
                            id: nodeId,
                            label: objectLabel,
                            value: objectValue,
                            isUri: object.termType === 'NamedNode',
                            isLiteral: false,
                            isBlank: object.termType === 'BlankNode'
                        });
                        nodeLabelToUri[objectLabel] = { uri: objectValue, dotId: nodeId };
                        if (!nodeLiterals.has(objectValue)) {
                            nodeLiterals.set(objectValue, []);
                        }
                    }
                    edges.push({
                        from: nodes.get(subjectValue).id,
                        to: nodes.get(objectValue).id,
                        label: predicateLabel,
                        predicateUri: predicateValue
                    });
                }
            });

            let dot = 'digraph RDFGraph {\n';
            dot += '    rankdir=LR;\n';
            dot += '    node [fontname="Arial", shape="ellipse"];\n';
            dot += '    edge [fontname="Arial", fontsize=10];\n';
            dot += '\n';

            nodes.forEach((nodeInfo, value) => {
                const literals = nodeLiterals.get(value) || [];
                const nameLabelLiterals = literals.filter(l => l.isNameLabel);
                const otherLiterals = literals.filter(l => !l.isNameLabel);

                let htmlLabel = '<';
                htmlLabel += formatLabelWithWrap(nodeInfo.label, currentMaxLabelLength, true);

                let addedLines = 1;
                for (const lit of nameLabelLiterals) {
                    if (addedLines >= MaxAggregationParams) break;
                    htmlLabel += '<BR/>';
                    htmlLabel += formatLabelWithWrap(lit.value, currentMaxLabelLength, false);
                    addedLines++;
                }

                for (const lit of otherLiterals) {
                    if (addedLines >= MaxAggregationParams) break;
                    htmlLabel += '<BR/>';
                    const fullText = lit.predicate + ': ' + lit.value;
                    const wrappedLines = wrapTextByWords(fullText, currentMaxLabelLength);
                    for (let j = 0; j < wrappedLines.length; j++) {
                        if (j > 0) htmlLabel += '<BR/>';
                        htmlLabel += `<FONT POINT-SIZE="8">${escapeHtmlLabel(wrappedLines[j])}</FONT>`;
                    }
                    addedLines++;
                }

                htmlLabel += '>';

                const nodeStyle = getNodeStyle(nodeInfo.value, false, nodeInfo.isBlank);
                dot += `    ${nodeInfo.id} [label=${htmlLabel} ${nodeStyle}];\n`;
            });

            dot += '\n';

            edges.forEach(edge => {
                const edgeStyle = getEdgeStyle(edge.predicateUri, edge.label);
                dot += `    ${edge.from} -> ${edge.to} [label="${escapeDotString(edge.label)}" ${edgeStyle}];\n`;
            });

            dot += '}\n';
            return dot;
        }

        function rdfToDot(quads, prefixes = {}) {
            if (currentMode === 'aggregation') {
                return rdfToDotAggregation(quads, prefixes);
            }

            if (currentMode === 'vad') {
                return rdfToDotVAD(quads, prefixes);
            }

            buildNodeTypesCache(currentQuads, prefixes);
            nodeLabelToUri = {};

            const nodes = new Map();
            const edges = [];

            quads.forEach(quad => {
                const subject = quad.subject;
                const predicate = quad.predicate;
                const object = quad.object;

                const subjectValue = subject.value;
                const predicateValue = predicate.value;
                const objectValue = object.value;

                const subjectLabel = getPrefixedName(subjectValue, prefixes);
                const predicateLabel = getPrefixedName(predicateValue, prefixes);
                const objectLabel = object.termType === 'Literal'
                    ? `"${objectValue}"`
                    : getPrefixedName(objectValue, prefixes);

                if (!nodes.has(subjectValue)) {
                    const nodeId = generateNodeId(subjectValue);
                    nodes.set(subjectValue, {
                        id: nodeId,
                        label: subjectLabel,
                        value: subjectValue,
                        isUri: subject.termType === 'NamedNode',
                        isBlank: subject.termType === 'BlankNode',
                        isLiteral: false
                    });
                    nodeLabelToUri[subjectLabel] = { uri: subjectValue, dotId: nodeId };
                }

                if (!nodes.has(objectValue)) {
                    const nodeId = generateNodeId(objectValue);
                    nodes.set(objectValue, {
                        id: nodeId,
                        label: objectLabel,
                        value: objectValue,
                        isUri: object.termType === 'NamedNode',
                        isLiteral: object.termType === 'Literal',
                        isBlank: object.termType === 'BlankNode'
                    });
                    nodeLabelToUri[objectLabel] = { uri: objectValue, dotId: nodeId };
                }

                edges.push({
                    from: nodes.get(subjectValue).id,
                    to: nodes.get(objectValue).id,
                    label: predicateLabel,
                    predicateUri: predicateValue
                });
            });

            let dot = 'digraph RDFGraph {\n';
            dot += '    rankdir=LR;\n';
            dot += '    node [fontname="Arial"];\n';
            dot += '    edge [fontname="Arial", fontsize=10];\n';
            dot += '\n';

            nodes.forEach((nodeInfo, value) => {
                const nodeStyle = getNodeStyle(nodeInfo.value, nodeInfo.isLiteral, nodeInfo.isBlank);

                if (currentMode === 'notation' && nodeInfo.label.length > currentMaxLabelLength) {
                    const wrappedLabel = formatLabelWithWrap(nodeInfo.label, currentMaxLabelLength, false);
                    dot += `    ${nodeInfo.id} [label=<${wrappedLabel}> ${nodeStyle}];\n`;
                } else {
                    dot += `    ${nodeInfo.id} [label="${escapeDotString(nodeInfo.label)}" ${nodeStyle}];\n`;
                }
            });

            dot += '\n';

            edges.forEach(edge => {
                const edgeStyle = getEdgeStyle(edge.predicateUri, edge.label);
                dot += `    ${edge.from} -> ${edge.to} [label="${escapeDotString(edge.label)}" ${edgeStyle}];\n`;
            });

            dot += '}\n';
            return dot;
        }
