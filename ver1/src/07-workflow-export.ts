        // @ts-nocheck — orchestration/export перенесены без изменения пользовательского поведения.
        async function visualize() {
            const rdfInput = document.getElementById('rdf-input').value.trim();
            const inputFormat = document.getElementById('input-format').value;
            const outputFormat = document.getElementById('output-format').value;
            const layoutEngine = document.getElementById('layout-engine').value;
            const visualizationMode = document.getElementById('visualization-mode').value;

            const maxLabelLengthInput = document.getElementById('max-label-length');
            const maxLabelLengthValue = parseInt(maxLabelLengthInput.value, 10);
            if (!isNaN(maxLabelLengthValue) && maxLabelLengthValue >= 5 && maxLabelLengthValue <= 200) {
                currentMaxLabelLength = maxLabelLengthValue;
            } else {
                currentMaxLabelLength = DEFAULT_MAX_LABEL_LENGTH;
                maxLabelLengthInput.value = DEFAULT_MAX_LABEL_LENGTH;
            }

            // Чтение параметра "Макс. длина VAD" для режима VAD
            const maxVadRowLengthInput = document.getElementById('max-vad-row-length');
            const maxVadRowLengthValue = parseInt(maxVadRowLengthInput.value, 10);
            if (!isNaN(maxVadRowLengthValue) && maxVadRowLengthValue >= 2 && maxVadRowLengthValue <= 20) {
                currentMaxVadRowLength = maxVadRowLengthValue;
            } else {
                currentMaxVadRowLength = DEFAULT_MAX_VAD_ROW_LENGTH;
                maxVadRowLengthInput.value = DEFAULT_MAX_VAD_ROW_LENGTH;
            }

            currentMode = visualizationMode;

            if (!rdfInput) {
                showError('Пожалуйста, введите RDF данные');
                return;
            }

            showLoading();

            const button = document.getElementById('visualize-btn');
            button.disabled = true;
            button.textContent = 'Обработка...';

            try {
                const parser = new N3.Parser({ format: inputFormat });
                const quads = [];
                let prefixes = {};

                await new Promise((resolve, reject) => {
                    parser.parse(rdfInput, (error, quad, parsedPrefixes) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        if (quad) {
                            quads.push(quad);
                        } else {
                            if (parsedPrefixes) {
                                prefixes = parsedPrefixes;
                            }
                            resolve();
                        }
                    });
                });

                currentPrefixes = prefixes;
                currentQuads = quads;
                currentStore = null;

                if (quads.length === 0) {
                    showError('Не найдено RDF триплетов в данных');
                    return;
                }

                // Валидация для режима VAD
                if (currentMode === 'vad') {
                    const validation = validateVAD(quads, prefixes);
                    if (!validation.valid) {
                        showValidationError(formatVADErrors(validation.errors));
                        button.disabled = false;
                        button.textContent = 'Визуализировать';
                        return;
                    }
                }

                activeFilters = [...getFilterConfig(currentMode).hiddenPredicates];

                const filteredQuads = quads.filter(quad => {
                    const predicateUri = quad.predicate.value;
                    const predicateLabel = getPrefixedName(predicateUri, prefixes);
                    return !isPredicateHidden(predicateUri, predicateLabel);
                });

                const dotCode = rdfToDot(filteredQuads, prefixes);
                currentDotCode = dotCode;
                console.log('Сгенерированный DOT-код:', dotCode);

                const viz = await Viz.instance();
                const svgString = viz.renderString(dotCode, {
                    format: 'svg',
                    engine: layoutEngine
                });

                const output = document.getElementById('output');
                currentScale = 1.0;
                applyZoom();

                if (outputFormat === 'svg') {
                    output.innerHTML = svgString;
                    currentSvgElement = output.querySelector('svg');
                    document.getElementById('export-buttons').style.display = 'block';
                    document.getElementById('zoom-controls').style.display = 'flex';
                } else if (outputFormat === 'png') {
                    const pngDataUrl = await svgToPng(svgString);
                    output.innerHTML = `<img src="${pngDataUrl}" alt="RDF Graph" style="max-width: 100%;">`;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = svgString;
                    currentSvgElement = tempDiv.querySelector('svg');
                    document.getElementById('export-buttons').style.display = 'block';
                    document.getElementById('zoom-controls').style.display = 'flex';
                }

                if (currentMode !== 'base') {
                    displayLegend();
                } else {
                    document.getElementById('legend-panel').style.display = 'none';
                }

                displayPrefixes(prefixes);
                displayFilters();
                addNodeClickHandlers();
                closeAllPropertiesPanels();

                console.log(`Обработано ${quads.length} триплетов`);

            } catch (error) {
                console.error('Ошибка визуализации:', error);
                showError(`${error.message}`);
            } finally {
                button.disabled = false;
                button.textContent = 'Визуализировать';
            }
        }

        // ============================================================================
        // ФУНКЦИИ ЭКСПОРТА
        // ============================================================================

        function svgToPng(svgString) {
            return new Promise((resolve, reject) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = svgString;
                const svgElement = tempDiv.querySelector('svg');

                let width = parseInt(svgElement.getAttribute('width')) || 800;
                let height = parseInt(svgElement.getAttribute('height')) || 600;

                const widthStr = svgElement.getAttribute('width') || '';
                const heightStr = svgElement.getAttribute('height') || '';

                if (widthStr.includes('pt')) {
                    width = Math.ceil(parseFloat(widthStr) * 1.33);
                }
                if (heightStr.includes('pt')) {
                    height = Math.ceil(parseFloat(heightStr) * 1.33);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width * 2;
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');
                ctx.scale(2, 2);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);

                const img = new Image();
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                img.onload = function() {
                    ctx.drawImage(img, 0, 0, width, height);
                    URL.revokeObjectURL(url);
                    resolve(canvas.toDataURL('image/png'));
                };

                img.onerror = function() {
                    URL.revokeObjectURL(url);
                    reject(new Error('Ошибка при конвертации SVG в PNG'));
                };

                img.src = url;
            });
        }

        function downloadSVG() {
            if (!currentSvgElement) {
                alert('Сначала визуализируйте RDF данные');
                return;
            }

            const svgData = new XMLSerializer().serializeToString(currentSvgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(svgBlob);
            downloadLink.download = 'rdf-graph.svg';

            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadLink.href);
        }

        async function downloadPNG() {
            if (!currentSvgElement) {
                alert('Сначала визуализируйте RDF данные');
                return;
            }

            try {
                const svgData = new XMLSerializer().serializeToString(currentSvgElement);
                const pngDataUrl = await svgToPng(svgData);

                const downloadLink = document.createElement('a');
                downloadLink.href = pngDataUrl;
                downloadLink.download = 'rdf-graph.png';

                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

            } catch (error) {
                console.error('Ошибка при скачивании PNG:', error);
                alert('Ошибка при создании PNG файла');
            }
        }

        /**
         * Маппинг внутренних форматов на сокращенные имена для URL
         */
        const formatMapping = {
            'turtle': 'ttl',
            'n-triples': 'nt',
            'n-quads': 'nq',
            'trig': 'trig'
        };

        /**
         * Открывает визуализацию в новом окне через внешний LDF сервис
         * Формирует URL с параметрами: rdf=данные&from=формат&to=png
         */
        function openInNewWindowLdfFi() {
            // Получаем входные данные
            const rdfInput = document.getElementById('rdf-input').value.trim();
            const inputFormat = document.getElementById('input-format').value;

            // Проверяем, что данные введены
            if (!rdfInput) {
                alert('Пожалуйста, введите RDF данные');
                return;
            }

            // Получаем формат для параметра URL
            const fromFormat = formatMapping[inputFormat] || 'ttl';

            // Кодируем RDF данные для URL
            // Заменяем пробелы на + для совместимости с LDF сервисом
            const encodedRdf = encodeURIComponent(rdfInput).replace(/%20/g, '+');

            // Формируем URL для внешнего сервиса
            const serviceUrl = `https://www.ldf.fi/service/rdf-grapher?rdf=${encodedRdf}&from=${fromFormat}&to=png`;

            // Открываем в новом окне
            window.open(serviceUrl, '_blank');
        }

        /**
         * Открывает визуализацию в новом окне через GitHub Pages (без внешнего сервиса)
         * Формирует URL с данными в хеше: #rdf=данные&from=формат&to=формат&mode=режим
         * Использует URL fragment (hash) вместо query params для избежания ошибки URI Too Long
         */
        function openInNewWindowGitHub() {
            // Получаем входные данные
            const rdfInput = document.getElementById('rdf-input').value.trim();
            const inputFormat = document.getElementById('input-format').value;
            const outputFormat = document.getElementById('output-format').value;
            const visualizationMode = document.getElementById('visualization-mode').value;

            // Проверяем, что данные введены
            if (!rdfInput) {
                alert('Пожалуйста, введите RDF данные');
                return;
            }

            // Получаем формат для параметра URL
            const fromFormat = formatMapping[inputFormat] || 'ttl';

            // Кодируем RDF данные для URL
            const encodedRdf = encodeURIComponent(rdfInput);

            // Определяем базовый URL для GitHub Pages
            let baseUrl;
            if (window.location.hostname === 'bpmbpm.github.io') {
                baseUrl = 'https://bpmbpm.github.io/rdf-grapher/ver4p/';
            } else {
                // Для локального тестирования используем текущий путь
                baseUrl = window.location.origin + window.location.pathname;
            }

            // Формируем URL с данными в хеше (избегает ошибки URI Too Long)
            const hashParams = `rdf=${encodedRdf}&from=${fromFormat}&to=${outputFormat}&mode=${visualizationMode}`;
            const serviceUrl = `${baseUrl}#${hashParams}`;

            // Открываем в новом окне
            window.open(serviceUrl, '_blank');
        }

        /**
         * Открывает DOT-код в GraphvizOnline для интерактивного редактирования
         * Использует хеш URL для передачи DOT-кода
         */
        function openInNewWindowGraphvizOnline() {
            // Проверяем, что DOT-код был сгенерирован
            if (!currentDotCode) {
                alert('Сначала визуализируйте RDF данные');
                return;
            }

            // Кодируем DOT-код для URL
            const encodedDot = encodeURIComponent(currentDotCode);

            // Формируем URL с DOT-кодом в хеше
            const graphvizUrl = `https://dreampuf.github.io/GraphvizOnline/#${encodedDot}`;

            // Открываем в новом окне
            window.open(graphvizUrl, '_blank');
        }
