        // @ts-nocheck — Comunica загружается как браузерный UMD-модуль без официальных глобальных типов.
        async function initSparqlEngine() {
            if (!currentStore) {
                currentStore = new N3.Store();
                currentQuads.forEach(quad => currentStore.addQuad(quad));
            }

            if (!comunicaEngine) {
                if (typeof Comunica !== 'undefined' && Comunica.QueryEngine) {
                    comunicaEngine = new Comunica.QueryEngine();
                }
            }

            return { store: currentStore, engine: comunicaEngine };
        }

        async function executeSparqlQuery() {
            const queryInput = document.getElementById('sparql-query');
            const resultsDiv = document.getElementById('sparql-results');
            const resultsContent = document.getElementById('sparql-results-content');

            const query = queryInput.value.trim();
            if (!query) {
                resultsContent.innerHTML = '<div class="sparql-error">Введите SPARQL запрос</div>';
                resultsDiv.style.display = 'block';
                return;
            }

            if (currentQuads.length === 0) {
                resultsContent.innerHTML = '<div class="sparql-error">Сначала визуализируйте RDF данные</div>';
                resultsDiv.style.display = 'block';
                return;
            }

            resultsContent.innerHTML = '<div class="sparql-loading"><div class="spinner"></div><p>Выполнение запроса...</p></div>';
            resultsDiv.style.display = 'block';

            try {
                const { store, engine } = await initSparqlEngine();

                if (!engine) {
                    throw new Error('SPARQL движок не инициализирован');
                }

                const bindingsStream = await engine.queryBindings(query, {
                    sources: [store]
                });

                const bindings = await bindingsStream.toArray();

                if (bindings.length === 0) {
                    resultsContent.innerHTML = '<p>Запрос не вернул результатов</p>';
                    return;
                }

                const variables = [...bindings[0].keys()].map(k => k.value);

                let html = '<table class="sparql-results-table">';
                html += '<thead><tr>';
                variables.forEach(v => {
                    html += `<th>?${v}</th>`;
                });
                html += '</tr></thead>';
                html += '<tbody>';

                let rowIndex = 0;
                bindings.forEach(binding => {
                    // Собираем URI из этой строки для навигации к узлу
                    const uris = [];
                    variables.forEach(v => {
                        const term = binding.get(v);
                        if (term && term.termType !== 'Literal') {
                            uris.push(term.value);
                        }
                    });

                    // Кодируем URI в base64 для передачи через data-атрибут
                    const urisData = btoa(encodeURIComponent(JSON.stringify(uris)));

                    html += `<tr class="clickable" data-row-index="${rowIndex}" data-uris="${urisData}" onclick="highlightNodeFromSparqlResult(this)">`;
                    variables.forEach(v => {
                        const term = binding.get(v);
                        if (term) {
                            const value = term.value;
                            const isLiteral = term.termType === 'Literal';
                            const displayValue = isLiteral ? `"${value}"` : getPrefixedName(value, currentPrefixes);
                            const cssClass = isLiteral ? 'literal' : 'uri';
                            html += `<td class="${cssClass}">${escapeHtml(displayValue)}</td>`;
                        } else {
                            html += '<td>-</td>';
                        }
                    });
                    html += '</tr>';
                    rowIndex++;
                });

                html += '</tbody></table>';
                html += `<p style="margin-top: 10px; font-size: 12px; color: #666;">Найдено результатов: ${bindings.length}</p>`;

                resultsContent.innerHTML = html;

            } catch (error) {
                console.error('Ошибка SPARQL:', error);
                resultsContent.innerHTML = `<div class="sparql-error">Ошибка: ${error.message}</div>`;
            }
        }

        /**
         * Подсвечивает узел на графе при клике на строку в результатах SPARQL
         * и открывает панель свойств для первого найденного URI
         *
         * @param {HTMLElement} rowElement - Элемент строки таблицы
         */
        function highlightNodeFromSparqlResult(rowElement) {
            // Снимаем подсветку со всех строк
            const allRows = document.querySelectorAll('.sparql-results-table tr.highlighted');
            allRows.forEach(row => row.classList.remove('highlighted'));

            // Подсвечиваем текущую строку
            rowElement.classList.add('highlighted');

            // Получаем URI из данных строки (base64 закодированный JSON)
            const urisData = rowElement.getAttribute('data-uris');
            if (!urisData) return;

            let uris;
            try {
                // Декодируем base64 и затем URL-декодируем
                uris = JSON.parse(decodeURIComponent(atob(urisData)));
            } catch (e) {
                console.error('Ошибка парсинга URI:', e);
                return;
            }

            if (uris.length === 0) return;

            // Снимаем выделение с предыдущего узла
            if (selectedNodeElement) {
                selectedNodeElement.classList.remove('selected');
                selectedNodeElement = null;
            }

            // Ищем узлы на графе по URI
            const output = document.getElementById('output');
            const svg = output ? output.querySelector('svg') : null;
            if (!svg) return;

            const nodes = svg.querySelectorAll('.node');
            let foundNode = null;
            let foundUri = null;
            let foundLabel = null;

            // Пробуем найти узел для первого URI
            for (const uri of uris) {
                for (const [label, info] of Object.entries(nodeLabelToUri)) {
                    if (info.uri === uri) {
                        // Нашли маппинг, ищем узел по dotId
                        for (const node of nodes) {
                            const titleElement = node.querySelector('title');
                            if (titleElement && titleElement.textContent === info.dotId) {
                                foundNode = node;
                                foundUri = uri;
                                foundLabel = label;
                                break;
                            }
                        }
                        if (foundNode) break;
                    }
                }
                if (foundNode) break;
            }

            if (foundNode) {
                // Выделяем найденный узел
                foundNode.classList.add('selected');
                selectedNodeElement = foundNode;

                // Прокручиваем к узлу
                foundNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

                // Открываем панель свойств для найденного URI
                if (foundUri) {
                    const displayLabel = foundLabel || getPrefixedName(foundUri, currentPrefixes);
                    showNodeProperties(foundUri, displayLabel);
                }
            } else if (uris.length > 0) {
                // Если узел не найден на графе, все равно открываем панель свойств для первого URI
                const uri = uris[0];
                const displayLabel = getPrefixedName(uri, currentPrefixes);
                showNodeProperties(uri, displayLabel);
            }
        }

        function resetSparqlQuery() {
            document.getElementById('sparql-query').value = defaultSparqlQuery;
            document.getElementById('sparql-results').style.display = 'none';
        }
