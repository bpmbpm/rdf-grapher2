
        // ============================================================================
        // ФУНКЦИИ ОТОБРАЖЕНИЯ
        // ============================================================================

        // @ts-nocheck — слой отображения работает с обязательными элементами статической страницы.
        function showLoading() {
            const output = document.getElementById('output');
            const resultContainer = document.getElementById('result-container');

            resultContainer.style.display = 'block';
            output.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Обработка RDF данных...</p>
                </div>
            `;

            document.getElementById('export-buttons').style.display = 'none';
            document.getElementById('zoom-controls').style.display = 'none';
            document.getElementById('prefixes-panel').style.display = 'none';
            document.getElementById('legend-panel').style.display = 'none';
            document.getElementById('filter-panel').style.display = 'none';
        }

        function showError(message) {
            const output = document.getElementById('output');
            const resultContainer = document.getElementById('result-container');

            resultContainer.style.display = 'block';
            output.innerHTML = `<div class="error"><strong>Ошибка:</strong> ${message}</div>`;

            document.getElementById('export-buttons').style.display = 'none';
            document.getElementById('zoom-controls').style.display = 'none';
            document.getElementById('prefixes-panel').style.display = 'none';
            document.getElementById('legend-panel').style.display = 'none';
            document.getElementById('filter-panel').style.display = 'none';
        }

        function showValidationError(message) {
            const output = document.getElementById('output');
            const resultContainer = document.getElementById('result-container');

            resultContainer.style.display = 'block';
            output.innerHTML = `<div class="validation-error">${message}</div>`;

            document.getElementById('export-buttons').style.display = 'none';
            document.getElementById('zoom-controls').style.display = 'none';
            document.getElementById('prefixes-panel').style.display = 'none';
            document.getElementById('legend-panel').style.display = 'none';
            document.getElementById('filter-panel').style.display = 'none';
        }

        function displayPrefixes(prefixes) {
            const prefixesPanel = document.getElementById('prefixes-panel');
            const prefixesContent = document.getElementById('prefixes-content');

            const prefixEntries = Object.entries(prefixes);
            if (prefixEntries.length === 0) {
                prefixesPanel.style.display = 'none';
                return;
            }

            prefixEntries.sort((a, b) => a[0].localeCompare(b[0]));

            let html = '';
            for (const [prefix, namespace] of prefixEntries) {
                html += `<div class="prefix-line">`;
                html += `<span class="prefix-name">@prefix ${prefix}:</span> `;
                html += `<a href="${namespace}" class="prefix-url" target="_blank">&lt;${namespace}&gt;</a> .`;
                html += `</div>`;
            }

            prefixesContent.innerHTML = html;
            prefixesPanel.style.display = 'block';
        }

        function displayLegend() {
            const legendPanel = document.getElementById('legend-panel');
            const legendContent = document.getElementById('legend-content');

            let html = '';

            // Выбираем источник стилей в зависимости от режима
            let nodeStylesSource, edgeStylesSource;

            if (currentMode === 'vad') {
                nodeStylesSource = VADNodeStyles;
                edgeStylesSource = VADEdgeStyles;
            } else if (currentMode === 'aggregation') {
                nodeStylesSource = AggregationNodeStyles;
                edgeStylesSource = StyleName.edgeStyles;
            } else {
                nodeStylesSource = StyleName.nodeStyles;
                edgeStylesSource = StyleName.edgeStyles;
            }

            html += '<div class="legend-section">';
            html += '<h4>Стили узлов (Node Styles)</h4>';

            for (const [styleName, styleConfig] of Object.entries(nodeStylesSource)) {
                const fillColorMatch = styleConfig.dot.match(/fillcolor="([^"]+)"/);
                const borderColorMatch = styleConfig.dot.match(/color="([^"]+)"/);
                const shapeMatch = styleConfig.dot.match(/shape="([^"]+)"/);

                const fillColor = fillColorMatch ? fillColorMatch[1] : '#ffffff';
                const borderColor = borderColorMatch ? borderColorMatch[1] : '#000000';
                const shape = shapeMatch ? shapeMatch[1] : 'ellipse';

                let shapeStyle = '';
                if (shape === 'box' || shape === 'note') {
                    shapeStyle = 'border-radius: 0;';
                } else if (shape === 'octagon') {
                    shapeStyle = 'border-radius: 0; clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);';
                } else if (shape === 'cds') {
                    shapeStyle = 'border-radius: 0; clip-path: polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%, 15% 50%);';
                } else {
                    shapeStyle = 'border-radius: 50%;';
                }

                html += `<div class="legend-item">`;
                html += `<div class="legend-shape" style="background-color: ${fillColor}; border-color: ${borderColor}; ${shapeStyle}"></div>`;
                html += `<span class="legend-label">${styleConfig.label}</span>`;
                html += `</div>`;
            }

            html += '</div>';

            html += '<div class="legend-section">';
            html += '<h4>Стили ребер (Edge Styles)</h4>';

            for (const [styleName, styleConfig] of Object.entries(edgeStylesSource)) {
                const colorMatch = styleConfig.dot.match(/color="([^"]+)"/);
                const penwidthMatch = styleConfig.dot.match(/penwidth="([^"]+)"/);
                const lineStyleMatch = styleConfig.dot.match(/style="([^"]+)"/);

                const color = colorMatch ? colorMatch[1] : '#666666';
                const penwidth = penwidthMatch ? parseInt(penwidthMatch[1]) : 1;
                const lineStyle = lineStyleMatch ? lineStyleMatch[1] : 'solid';

                let borderStyle = 'solid';
                if (lineStyle === 'dashed') borderStyle = 'dashed';
                if (lineStyle === 'dotted') borderStyle = 'dotted';

                html += `<div class="legend-item">`;
                html += `<span class="legend-line" style="background-color: ${color}; height: ${penwidth + 1}px; border-bottom: ${penwidth}px ${borderStyle} ${color}; background: none;"></span>`;
                html += `<span class="legend-label">${styleConfig.label}</span>`;
                html += `</div>`;
            }

            html += '</div>';

            legendContent.innerHTML = html;
            legendPanel.style.display = 'block';
        }

        function updateModeDescription() {
            const mode = document.getElementById('visualization-mode').value;
            const description = document.getElementById('mode-description');
            const maxVadRowLengthGroup = document.getElementById('max-vad-row-length-group');

            const descriptions = {
                'notation': 'С выделением типов объектов и предикатов цветом и формами',
                'base': 'Базовый режим без специальных стилей',
                'aggregation': 'Литералы агрегируются в узел субъекта',
                'vad': 'VAD: процессы как cds-фигуры с исполнителями'
            };

            description.textContent = descriptions[mode] || '';

            // Показываем/скрываем параметр "Макс. длина VAD" только для режима VAD
            if (mode === 'vad') {
                maxVadRowLengthGroup.style.display = 'block';
            } else {
                maxVadRowLengthGroup.style.display = 'none';
            }
        }

        function toggleSparqlPanel() {
            const sparqlMode = document.getElementById('sparql-mode').value;
            const sparqlPanel = document.getElementById('sparql-panel');

            if (sparqlMode === 'yes') {
                sparqlPanel.classList.add('visible');
            } else {
                sparqlPanel.classList.remove('visible');
            }
        }

        // ============================================================================
        // ОСНОВНАЯ ФУНКЦИЯ ВИЗУАЛИЗАЦИИ
        // ============================================================================
