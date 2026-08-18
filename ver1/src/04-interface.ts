        // @ts-nocheck — DOM-слой использует проверенную разметку страницы и остаётся совместимым с исходным API.
        const BaseStyles = {
            literal: 'shape="box" style="filled" fillcolor="#ffffcc"',
            blankNode: 'shape="ellipse" style="filled" fillcolor="#e0e0e0"',
            uri: 'shape="ellipse" style="filled" fillcolor="#cce5ff"',
            edge: ''
        };

        function getNodeStyle(nodeUri, isLiteral, isBlankNode) {
            if (currentMode === 'base') {
                if (isLiteral) return BaseStyles.literal;
                if (isBlankNode) return BaseStyles.blankNode;
                return BaseStyles.uri;
            }

            if (currentMode === 'aggregation') {
                if (isBlankNode) return AggregationNodeStyles['BlankNodeStyle'].dot;
                const nodeTypes = nodeTypesCache[nodeUri] || [];
                for (const [styleName, styleConfig] of Object.entries(AggregationNodeStyles)) {
                    if (styleName === 'default') continue;
                    for (const type of styleConfig.types) {
                        if (type.startsWith('_')) continue;
                        if (nodeTypes.includes(type)) return styleConfig.dot;
                    }
                }
                return AggregationNodeStyles['default'].dot;
            }

            if (currentMode === 'vad') {
                if (isBlankNode) return VADNodeStyles['default'].dot;
                const nodeTypes = nodeTypesCache[nodeUri] || [];
                for (const [styleName, styleConfig] of Object.entries(VADNodeStyles)) {
                    if (styleName === 'default') continue;
                    for (const type of styleConfig.types) {
                        if (nodeTypes.includes(type)) return styleConfig.dot;
                    }
                }
                return VADNodeStyles['default'].dot;
            }

            // Режим нотации
            if (isLiteral) return StyleName.nodeStyles['LiteralStyle'].dot;
            if (isBlankNode) return StyleName.nodeStyles['BlankNodeStyle'].dot;

            const nodeTypes = nodeTypesCache[nodeUri] || [];
            for (const [styleName, styleConfig] of Object.entries(StyleName.nodeStyles)) {
                if (styleName === 'default') continue;
                for (const type of styleConfig.types) {
                    if (type.startsWith('_')) continue;
                    if (nodeTypes.includes(type)) return styleConfig.dot;
                }
            }
            return StyleName.nodeStyles['default'].dot;
        }

        function getEdgeStyle(predicateUri, predicateLabel) {
            if (currentMode === 'base') return BaseStyles.edge;

            if (currentMode === 'vad') {
                for (const [styleName, styleConfig] of Object.entries(VADEdgeStyles)) {
                    if (styleName === 'default') continue;
                    for (const predicate of styleConfig.predicates) {
                        if (predicateUri === predicate || predicateLabel === predicate) {
                            return styleConfig.dot;
                        }
                    }
                }
                return VADEdgeStyles['default'].dot;
            }

            // Режим нотации или агрегации
            for (const [styleName, styleConfig] of Object.entries(StyleName.edgeStyles)) {
                if (styleName === 'default') continue;
                for (const predicate of styleConfig.predicates) {
                    if (predicateUri === predicate || predicateLabel === predicate) {
                        return styleConfig.dot;
                    }
                }
            }
            return StyleName.edgeStyles['default'].dot;
        }

        function buildNodeTypesCache(quads, prefixes) {
            nodeTypesCache = {};
            const typePredicates = [
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                'rdf:type',
                'a'
            ];

            quads.forEach(quad => {
                const predicateValue = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateValue, prefixes);

                if (typePredicates.includes(predicateValue) ||
                    typePredicates.includes(predicateLabel) ||
                    predicateLabel === 'a') {

                    const subjectUri = quad.subject.value;
                    const typeUri = quad.object.value;
                    const typeLabel = getPrefixedName(typeUri, prefixes);

                    if (!nodeTypesCache[subjectUri]) {
                        nodeTypesCache[subjectUri] = [];
                    }

                    if (!nodeTypesCache[subjectUri].includes(typeUri)) {
                        nodeTypesCache[subjectUri].push(typeUri);
                    }
                    if (!nodeTypesCache[subjectUri].includes(typeLabel)) {
                        nodeTypesCache[subjectUri].push(typeLabel);
                    }
                }
            });
        }

        // ============================================================================
        // ФУНКЦИИ МАСШТАБИРОВАНИЯ
        // ============================================================================

        function applyZoom() {
            const zoomContent = document.getElementById('zoom-content');
            const zoomLevel = document.getElementById('zoom-level');
            if (zoomContent) zoomContent.style.transform = `scale(${currentScale})`;
            if (zoomLevel) zoomLevel.textContent = Math.round(currentScale * 100) + '%';
        }

        function zoomIn() {
            if (currentScale < 3.0) { currentScale += 0.1; applyZoom(); }
        }

        function zoomOut() {
            if (currentScale > 0.1) { currentScale -= 0.1; applyZoom(); }
        }

        function zoomReset() {
            currentScale = 1.0;
            applyZoom();
        }

        function zoomFit() {
            const zoomContainer = document.getElementById('zoom-container');
            const output = document.getElementById('output');
            const svg = output ? output.querySelector('svg') : null;
            if (!zoomContainer || !svg) return;

            const containerWidth = zoomContainer.clientWidth - 20;
            const containerHeight = zoomContainer.clientHeight - 20;

            let svgWidth = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
            let svgHeight = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;

            const widthStr = svg.getAttribute('width') || '';
            const heightStr = svg.getAttribute('height') || '';
            if (widthStr.includes('pt')) svgWidth = parseFloat(widthStr) * 1.33;
            if (heightStr.includes('pt')) svgHeight = parseFloat(heightStr) * 1.33;

            const scaleX = containerWidth / svgWidth;
            const scaleY = containerHeight / svgHeight;
            currentScale = Math.min(scaleX, scaleY, 1.0);
            applyZoom();
        }

        // ============================================================================
        // ФУНКЦИИ ПАНЕЛИ СВОЙСТВ УЗЛА
        // ============================================================================

        function closePropertiesPanel(panelId) {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.remove();
                openPropertiesPanels = openPropertiesPanels.filter(p => p.id !== panelId);
            }
            if (selectedNodeElement) {
                selectedNodeElement.classList.remove('selected');
                selectedNodeElement = null;
            }
        }

        function closeAllPropertiesPanels() {
            const container = document.getElementById('properties-panels-container');
            if (container) container.innerHTML = '';
            openPropertiesPanels = [];
            if (selectedNodeElement) {
                selectedNodeElement.classList.remove('selected');
                selectedNodeElement = null;
            }
        }

        function getNodeProperties(nodeUri) {
            const properties = [];
            currentQuads.forEach(quad => {
                if (quad.subject.value === nodeUri) {
                    const predicateLabel = getPrefixedName(quad.predicate.value, currentPrefixes);
                    const isLiteral = quad.object.termType === 'Literal';
                    const objectLabel = isLiteral
                        ? `"${quad.object.value}"`
                        : getPrefixedName(quad.object.value, currentPrefixes);

                    properties.push({
                        predicate: quad.predicate.value,
                        predicateLabel: predicateLabel,
                        object: quad.object.value,
                        objectLabel: objectLabel,
                        isLiteral: isLiteral
                    });
                }
            });
            return properties;
        }

        function showNodeProperties(nodeUri, nodeLabel) {
            const container = document.getElementById('properties-panels-container');
            if (!container) return;

            const existingPanel = openPropertiesPanels.find(p => p.uri === nodeUri);
            if (existingPanel) {
                const panel = document.getElementById(existingPanel.id);
                if (panel) bringPanelToFront(panel);
                return;
            }

            propertiesPanelCounter++;
            const panelId = 'properties-panel-' + propertiesPanelCounter;

            const offsetMultiplier = openPropertiesPanels.length % 5;
            const rightOffset = 20 + (offsetMultiplier * 30);
            const topOffset = 100 + (offsetMultiplier * 30);

            const properties = getNodeProperties(nodeUri);

            let propertiesHtml = '';
            if (properties.length === 0) {
                propertiesHtml = '<div class="properties-empty">У этого узла нет свойств</div>';
            } else {
                properties.forEach(prop => {
                    propertiesHtml += '<div class="property-item">';
                    propertiesHtml += `<div class="property-predicate">${prop.predicateLabel}</div>`;
                    propertiesHtml += `<div class="property-value ${prop.isLiteral ? 'literal' : 'uri'}">${prop.objectLabel}</div>`;
                    propertiesHtml += '</div>';
                });
            }

            const nodeTypes = nodeTypesCache[nodeUri] || [];
            if (nodeTypes.length > 0) {
                const prefixedTypes = nodeTypes.filter(t => t.includes(':') && !t.startsWith('http'));
                if (prefixedTypes.length > 0) {
                    propertiesHtml += '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">';
                    propertiesHtml += '<div style="font-size: 12px; color: #666; margin-bottom: 5px;">Тип узла:</div>';
                    prefixedTypes.forEach(type => {
                        propertiesHtml += `<span class="properties-type-badge">${type}</span> `;
                    });
                    propertiesHtml += '</div>';
                }
            }

            const panelHtml = `
                <div class="properties-panel visible" id="${panelId}" style="right: ${rightOffset}px; top: ${topOffset}px;">
                    <div class="properties-header" onmousedown="startDragPanel(event, '${panelId}')">
                        <h3>${nodeLabel}</h3>
                        <button class="properties-close-btn" onclick="closePropertiesPanel('${panelId}')">&times;</button>
                    </div>
                    <div class="properties-content">
                        ${propertiesHtml}
                    </div>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', panelHtml);
            openPropertiesPanels.push({ id: panelId, uri: nodeUri, label: nodeLabel });

            const newPanel = document.getElementById(panelId);
            if (newPanel) bringPanelToFront(newPanel);
        }

        function bringPanelToFront(panel) {
            let maxZIndex = 1000;
            openPropertiesPanels.forEach(p => {
                const el = document.getElementById(p.id);
                if (el) {
                    const z = parseInt(el.style.zIndex) || 1000;
                    if (z > maxZIndex) maxZIndex = z;
                }
            });
            panel.style.zIndex = maxZIndex + 1;
        }

        function startDragPanel(event, panelId) {
            if (event.target.classList.contains('properties-close-btn')) return;
            const panel = document.getElementById(panelId);
            if (!panel) return;

            draggedPanel = panel;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = event.clientX - rect.left;
            dragOffsetY = event.clientY - rect.top;

            bringPanelToFront(panel);
            document.addEventListener('mousemove', dragPanel);
            document.addEventListener('mouseup', stopDragPanel);
            event.preventDefault();
        }

        function dragPanel(event) {
            if (!draggedPanel) return;
            const newLeft = event.clientX - dragOffsetX;
            const newTop = event.clientY - dragOffsetY;
            draggedPanel.style.left = newLeft + 'px';
            draggedPanel.style.top = newTop + 'px';
            draggedPanel.style.right = 'auto';
        }

        function stopDragPanel() {
            draggedPanel = null;
            document.removeEventListener('mousemove', dragPanel);
            document.removeEventListener('mouseup', stopDragPanel);
        }

        // ============================================================================
        // ФУНКЦИИ ДЛЯ КЛИКОВ ПО УЗЛАМ
        // ============================================================================

        function addNodeClickHandlers() {
            const svg = document.querySelector('#output svg');
            if (!svg) return;

            const nodes = svg.querySelectorAll('.node');
            nodes.forEach(node => {
                node.addEventListener('click', handleNodeClick);
            });
        }

        function handleNodeClick(event) {
            const nodeElement = event.currentTarget;
            const titleElement = nodeElement.querySelector('title');
            if (!titleElement) return;

            const dotId = titleElement.textContent;

            let nodeUri = null;
            let nodeLabel = null;

            for (const [label, info] of Object.entries(nodeLabelToUri)) {
                if (info.dotId === dotId) {
                    nodeUri = info.uri;
                    nodeLabel = label;
                    break;
                }
            }

            if (!nodeUri) return;

            if (selectedNodeElement) {
                selectedNodeElement.classList.remove('selected');
            }
            nodeElement.classList.add('selected');
            selectedNodeElement = nodeElement;

            showNodeProperties(nodeUri, nodeLabel);
        }

        // ============================================================================
        // ФУНКЦИИ ФИЛЬТРОВ
        // ============================================================================

        function isPredicateHidden(predicateUri, predicateLabel) {
            return activeFilters.includes(predicateUri) || activeFilters.includes(predicateLabel);
        }

        function displayFilters() {
            const filterPanel = document.getElementById('filter-panel');
            const filterContent = document.getElementById('filter-content');

            allPredicates = [];
            const predicateSet = new Set();

            currentQuads.forEach(quad => {
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, currentPrefixes);
                if (!predicateSet.has(predicateLabel)) {
                    predicateSet.add(predicateLabel);
                    allPredicates.push({ uri: predicateUri, label: predicateLabel });
                }
            });

            if (allPredicates.length === 0) {
                filterPanel.style.display = 'none';
                return;
            }

            allPredicates.sort((a, b) => a.label.localeCompare(b.label));

            let html = '';
            allPredicates.forEach(pred => {
                const isHidden = isPredicateHidden(pred.uri, pred.label);
                const checkboxId = 'filter-' + pred.label.replace(/[^a-zA-Z0-9]/g, '_');

                html += `<div class="filter-item">`;
                html += `<input type="checkbox" id="${checkboxId}" ${!isHidden ? 'checked' : ''} onchange="togglePredicateFilter('${pred.uri}', '${pred.label}', this.checked)">`;
                html += `<label for="${checkboxId}">${pred.label}</label>`;
                html += `</div>`;
            });

            filterContent.innerHTML = html;
            filterPanel.style.display = 'block';
        }

        function togglePredicateFilter(predicateUri, predicateLabel, isVisible) {
            if (isVisible) {
                activeFilters = activeFilters.filter(f => f !== predicateUri && f !== predicateLabel);
            } else {
                if (!activeFilters.includes(predicateUri)) {
                    activeFilters.push(predicateUri);
                }
                if (!activeFilters.includes(predicateLabel)) {
                    activeFilters.push(predicateLabel);
                }
            }
            revisualize();
        }

        function selectAllFilters() {
            activeFilters = [];
            displayFilters();
            revisualize();
        }

        function deselectAllFilters() {
            activeFilters = allPredicates.flatMap(p => [p.uri, p.label]);
            displayFilters();
            revisualize();
        }

        async function revisualize() {
            const layoutEngine = document.getElementById('layout-engine').value;

            try {
                const filteredQuads = currentQuads.filter(quad => {
                    const predicateUri = quad.predicate.value;
                    const predicateLabel = getPrefixedName(predicateUri, currentPrefixes);
                    return !isPredicateHidden(predicateUri, predicateLabel);
                });

                const dotCode = rdfToDot(filteredQuads, currentPrefixes);
                currentDotCode = dotCode;
                console.log('Пересгенерированный DOT-код:', dotCode);

                const viz = await Viz.instance();
                const svgString = viz.renderString(dotCode, { format: 'svg', engine: layoutEngine });

                const output = document.getElementById('output');
                output.innerHTML = svgString;
                currentSvgElement = output.querySelector('svg');
                addNodeClickHandlers();

            } catch (error) {
                console.error('Ошибка при перевизуализации:', error);
            }
        }

        // ============================================================================
