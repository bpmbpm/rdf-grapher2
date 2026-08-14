
        // @ts-nocheck — конфигурация перенесена без изменения поведения; публичные контракты типизированы в 00-types.ts.
        const Mode: VisualizationMode = 'notation';

        // ============================================================================
        // КОНФИГУРАЦИЯ ФИЛЬТРОВ
        // ============================================================================

        const Filter = {
            hiddenPredicates: [
                'rdf:type',
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                'rdfs:subClassOf',
                'http://www.w3.org/2000/01/rdf-schema#subClassOf'
            ]
        };

        const FilterBase = {
            hiddenPredicates: []
        };

        const FilterAggregation = {
            hiddenPredicates: [
                'rdf:type',
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                'rdfs:subClassOf',
                'http://www.w3.org/2000/01/rdf-schema#subClassOf'
            ]
        };

        // Фильтры для режима VAD - скрываем hasParent и rdf:type
        const FilterVAD = {
            hiddenPredicates: [
                'rdf:type',
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                'vad:hasParent',
                'http://example.org/vad#hasParent'
            ]
        };

        function getFilterConfig(mode) {
            if (mode === 'base') {
                return FilterBase;
            } else if (mode === 'aggregation') {
                return FilterAggregation;
            } else if (mode === 'vad') {
                return FilterVAD;
            }
            return Filter;
        }

        // ============================================================================
        // КОНФИГУРАЦИЯ АГРЕГАЦИИ
        // ============================================================================

        const MaxAggregationParams = 5;
        const DEFAULT_MAX_LABEL_LENGTH = 25;
        let currentMaxLabelLength = DEFAULT_MAX_LABEL_LENGTH;

        // Максимальное количество VAD элементов (CDS) в одной горизонтальной строке
        const DEFAULT_MAX_VAD_ROW_LENGTH = 8;
        let currentMaxVadRowLength = DEFAULT_MAX_VAD_ROW_LENGTH;

        // ============================================================================
        // КОНФИГУРАЦИЯ VAD (Value Added Chain Diagram)
        // ============================================================================

        /**
         * VAD_ALLOWED_TYPES - Разрешенные типы объектов для режима VAD
         */
        const VAD_ALLOWED_TYPES = [
            'vad:Process',
            'http://example.org/vad#Process',
            'vad:ExecutorGroup',
            'http://example.org/vad#ExecutorGroup',
            'vad:Executor',
            'http://example.org/vad#Executor'
        ];

        /**
         * VAD_ALLOWED_PREDICATES - Разрешенные предикаты для режима VAD
         */
        const VAD_ALLOWED_PREDICATES = [
            'rdf:type',
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            'rdfs:label',
            'http://www.w3.org/2000/01/rdf-schema#label',
            'dcterms:description',
            'http://purl.org/dc/terms/description',
            'vad:hasNext',
            'http://example.org/vad#hasNext',
            'vad:hasExecutor',
            'http://example.org/vad#hasExecutor',
            'vad:hasParent',
            'http://example.org/vad#hasParent',
            'vad:includes',
            'http://example.org/vad#includes'
        ];

        /**
         * Валидирует RDF триплеты на соответствие схеме VAD
         * @param {Array} quads - Массив RDF триплетов
         * @param {Object} prefixes - Объект с префиксами
         * @returns {Object} - {valid: boolean, errors: Array}
         */
        function validateVAD(quads, prefixes) {
            const errors = [];

            quads.forEach((quad, index) => {
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);

                // Проверяем, что предикат разрешен
                const predicateAllowed = VAD_ALLOWED_PREDICATES.some(allowed =>
                    predicateUri === allowed || predicateLabel === allowed
                );

                if (!predicateAllowed) {
                    const subjectLabel = getPrefixedName(quad.subject.value, prefixes);
                    const objectLabel = quad.object.termType === 'Literal'
                        ? `"${quad.object.value}"`
                        : getPrefixedName(quad.object.value, prefixes);

                    errors.push({
                        triple: `${subjectLabel} ${predicateLabel} ${objectLabel}`,
                        position: 'predicate',
                        value: predicateLabel,
                        message: `Недопустимый предикат: ${predicateLabel}`
                    });
                }

                // Если предикат - rdf:type, проверяем, что тип разрешен
                const typePredicates = [
                    'rdf:type',
                    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
                ];

                if (typePredicates.includes(predicateUri) || typePredicates.includes(predicateLabel)) {
                    const typeUri = quad.object.value;
                    const typeLabel = getPrefixedName(typeUri, prefixes);

                    const typeAllowed = VAD_ALLOWED_TYPES.some(allowed =>
                        typeUri === allowed || typeLabel === allowed
                    );

                    if (!typeAllowed) {
                        const subjectLabel = getPrefixedName(quad.subject.value, prefixes);

                        errors.push({
                            triple: `${subjectLabel} ${predicateLabel} ${typeLabel}`,
                            position: 'object (type)',
                            value: typeLabel,
                            message: `Недопустимый тип объекта: ${typeLabel}`
                        });
                    }
                }
            });

            return {
                valid: errors.length === 0,
                errors: errors
            };
        }

        /**
         * Форматирует ошибки валидации VAD для отображения
         * @param {Array} errors - Массив ошибок
         * @returns {string} - Отформатированное сообщение
         */
        function formatVADErrors(errors) {
            let message = 'ОШИБКА ВАЛИДАЦИИ VAD\n';
            message += '═══════════════════════════════════════\n\n';

            errors.forEach((error, index) => {
                message += `Ошибка ${index + 1}:\n`;
                message += `  Триплет: ${error.triple}\n`;
                message += `  Позиция: ${error.position}\n`;
                message += `  Значение: ${error.value}\n`;
                message += `  ${error.message}\n\n`;
            });

            message += '═══════════════════════════════════════\n';
            message += `Всего ошибок: ${errors.length}\n`;
            message += '\nРазрешенные типы: vad:Process, vad:ExecutorGroup, vad:Executor\n';
            message += 'Разрешенные предикаты: rdf:type, rdfs:label, dcterms:description,\n';
            message += '  vad:hasNext, vad:hasExecutor, vad:hasParent, vad:includes';

            return message;
        }

        // ============================================================================
        // КОНФИГУРАЦИЯ СТИЛЕЙ
        // ============================================================================

        const StyleName = {
            nodeStyles: {
                'PersonStyle': {
                    types: ['foaf:Person', 'schema:Person', 'http://xmlns.com/foaf/0.1/Person'],
                    dot: 'shape="octagon" height="0.75" width="0.75" fixedsize="true" color="#9C27B0" fillcolor="#F3E5F5" fontname="Arial" fontsize="10" style="filled"',
                    label: 'Люди (foaf:Person)',
                    description: 'Объекты типа foaf:Person или schema:Person'
                },
                'OrganizationStyle': {
                    types: ['foaf:Organization', 'schema:Organization', 'http://xmlns.com/foaf/0.1/Organization'],
                    dot: 'shape="box" height="0.6" width="1.2" color="Blue" fillcolor="#E6F3FF" fontname="Arial" fontsize="10" style="filled,bold"',
                    label: 'Организации (foaf:Organization)',
                    description: 'Объекты типа foaf:Organization'
                },
                'DocumentStyle': {
                    types: ['foaf:Document', 'schema:Document', 'http://xmlns.com/foaf/0.1/Document'],
                    dot: 'shape="note" height="0.6" width="1.0" color="Green" fillcolor="#E8F5E9" fontname="Arial" fontsize="10" style="filled"',
                    label: 'Документы (foaf:Document)',
                    description: 'Объекты типа foaf:Document'
                },
                'LiteralStyle': {
                    types: ['_Literal'],
                    dot: 'shape="box" color="#666666" fillcolor="#FFFFCC" fontname="Arial" fontsize="9" style="filled,rounded"',
                    label: 'Литералы (Literal)',
                    description: 'Строковые значения, числа, даты'
                },
                'BlankNodeStyle': {
                    types: ['_BlankNode'],
                    dot: 'shape="ellipse" color="#999999" fillcolor="#E0E0E0" fontname="Arial" fontsize="9" style="filled,dashed"',
                    label: 'Пустые узлы (BlankNode)',
                    description: 'Анонимные узлы без URI'
                },
                'default': {
                    types: [],
                    dot: 'shape="ellipse" color="#1976D2" fillcolor="#CCE5FF" fontname="Arial" fontsize="10" style="filled"',
                    label: 'По умолчанию (URI)',
                    description: 'Все остальные URI-ресурсы'
                }
            },
            edgeStyles: {
                'TypeStyle': {
                    predicates: ['rdf:type', 'a', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
                    dot: 'color="#9C27B0" penwidth="2" style="dashed" arrowhead="empty"',
                    label: 'Тип объекта (rdf:type)',
                    description: 'Связь объекта с его RDF-типом'
                },
                'KnowsStyle': {
                    predicates: ['foaf:knows', 'http://xmlns.com/foaf/0.1/knows'],
                    dot: 'color="#4CAF50" penwidth="2" style="solid" arrowhead="vee"',
                    label: 'Знает (foaf:knows)',
                    description: 'Социальная связь между людьми'
                },
                'MemberStyle': {
                    predicates: ['foaf:member', 'schema:member', 'http://xmlns.com/foaf/0.1/member'],
                    dot: 'color="#795548" penwidth="2" style="solid" arrowhead="diamond"',
                    label: 'Член (foaf:member)',
                    description: 'Членство в организации'
                },
                'AttributeStyle': {
                    predicates: [
                        'foaf:name', 'http://xmlns.com/foaf/0.1/name',
                        'foaf:age', 'http://xmlns.com/foaf/0.1/age',
                        'rdfs:label', 'http://www.w3.org/2000/01/rdf-schema#label',
                        'rdfs:comment', 'http://www.w3.org/2000/01/rdf-schema#comment'
                    ],
                    dot: 'color="#2196F3" penwidth="1" style="dotted" arrowhead="normal"',
                    label: 'Атрибуты (name, label...)',
                    description: 'Свойства объекта: имя, возраст и др.'
                },
                'default': {
                    predicates: [],
                    dot: 'color="#666666" penwidth="1" style="solid" arrowhead="normal"',
                    label: 'По умолчанию',
                    description: 'Все остальные предикаты'
                }
            }
        };

        // ============================================================================
        // СТИЛИ VAD (Value Added Chain Diagram)
        // ============================================================================

        const VADNodeStyles = {
            'ProcessStyle': {
                types: ['vad:Process', 'http://example.org/vad#Process'],
                // cds shape (chevron) с зелёной заливкой
                dot: 'shape="cds" height="0.8" width="1.5" color="#2E7D32" fillcolor="#A5D6A7" fontname="Arial" fontsize="11" style="filled"',
                label: 'Процесс (vad:Process)',
                description: 'Бизнес-процесс в VAD диаграмме'
            },
            'ExecutorGroupStyle': {
                types: ['vad:ExecutorGroup', 'http://example.org/vad#ExecutorGroup'],
                dot: 'shape="ellipse" color="#B8860B" fillcolor="#FFFFCC" fontname="Arial" fontsize="9" style="filled"',
                label: 'Группа исполнителей (vad:ExecutorGroup)',
                description: 'Группа исполнителей процесса (эллипс с желтоватой заливкой)'
            },
            'ExecutorStyle': {
                types: ['vad:Executor', 'http://example.org/vad#Executor'],
                dot: 'shape="ellipse" height="0.4" width="0.8" color="#6A1B9A" fillcolor="#E1BEE7" fontname="Arial" fontsize="9" style="filled"',
                label: 'Исполнитель (vad:Executor)',
                description: 'Исполнитель процесса'
            },
            'default': {
                types: [],
                dot: 'shape="ellipse" color="#1976D2" fillcolor="#CCE5FF" fontname="Arial" fontsize="10" style="filled"',
                label: 'По умолчанию',
                description: 'Другие объекты'
            }
        };

        const VADEdgeStyles = {
            'HasNextStyle': {
                predicates: ['vad:hasNext', 'http://example.org/vad#hasNext'],
                // Зелёная стрелка для связей между процессами
                dot: 'color="#2E7D32" penwidth="2" style="solid" arrowhead="vee"',
                label: 'Следующий (vad:hasNext)',
                description: 'Связь с следующим процессом'
            },
            'HasExecutorStyle': {
                predicates: ['vad:hasExecutor', 'http://example.org/vad#hasExecutor'],
                dot: 'color="#1565C0" penwidth="1" style="dashed" arrowhead="none"',
                label: 'Исполнитель (vad:hasExecutor)',
                description: 'Связь процесса с группой исполнителей (ненаправленная)'
            },
            'IncludesStyle': {
                predicates: ['vad:includes', 'http://example.org/vad#includes'],
                dot: 'color="#6A1B9A" penwidth="1" style="dotted" arrowhead="normal"',
                label: 'Включает (vad:includes)',
                description: 'Связь группы с исполнителями'
            },
            'HasParentStyle': {
                predicates: ['vad:hasParent', 'http://example.org/vad#hasParent'],
                dot: 'color="#999999" penwidth="1" style="dashed" arrowhead="empty"',
                label: 'Родитель (vad:hasParent)',
                description: 'Связь с родительским процессом'
            },
            'TypeStyle': {
                predicates: ['rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
                dot: 'color="#9C27B0" penwidth="1" style="dashed" arrowhead="empty"',
                label: 'Тип (rdf:type)',
                description: 'Тип объекта'
            },
            'default': {
                predicates: [],
                dot: 'color="#666666" penwidth="1" style="solid" arrowhead="normal"',
                label: 'По умолчанию',
                description: 'Другие связи'
            }
        };

        const AggregationNodeStyles = {
            'PersonStyle': {
                types: ['foaf:Person', 'schema:Person', 'http://xmlns.com/foaf/0.1/Person'],
                dot: 'shape="ellipse" color="#9C27B0" penwidth="2" fillcolor="#F3E5F5" fontname="Arial" fontsize="10" style="filled"',
                label: 'Люди (foaf:Person)',
                description: 'Объекты типа foaf:Person'
            },
            'OrganizationStyle': {
                types: ['foaf:Organization', 'schema:Organization', 'http://xmlns.com/foaf/0.1/Organization'],
                dot: 'shape="ellipse" color="Blue" penwidth="3" fillcolor="#E3F2FD" fontname="Arial" fontsize="10" style="filled"',
                label: 'Организации (foaf:Organization)',
                description: 'Объекты типа foaf:Organization'
            },
            'DocumentStyle': {
                types: ['foaf:Document', 'schema:Document', 'http://xmlns.com/foaf/0.1/Document'],
                dot: 'shape="ellipse" color="Green" penwidth="2" fillcolor="#E8F5E9" fontname="Arial" fontsize="10" style="filled"',
                label: 'Документы (foaf:Document)',
                description: 'Объекты типа foaf:Document'
            },
            'BlankNodeStyle': {
                types: ['_BlankNode'],
                dot: 'shape="ellipse" color="#999999" penwidth="1" fillcolor="#E0E0E0" fontname="Arial" fontsize="9" style="filled,dashed"',
                label: 'Пустые узлы (BlankNode)',
                description: 'Анонимные узлы без URI'
            },
            'default': {
                types: [],
                dot: 'shape="ellipse" color="#1976D2" penwidth="1" fillcolor="#CCE5FF" fontname="Arial" fontsize="10" style="filled"',
                label: 'По умолчанию (URI)',
                description: 'Все остальные URI-ресурсы'
            }
        };

        // ============================================================================
        // ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
        // ============================================================================

        let currentSvgElement = null;
        let currentScale = 1.0;
        let currentPrefixes = {};
        let nodeTypesCache = {};
        let currentQuads = [];
        let nodeLabelToUri = {};
        let selectedNodeElement = null;
        let propertiesPanelCounter = 0;
        let openPropertiesPanels = [];
        let currentMode = Mode;
        let draggedPanel = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let currentStore = null;
        let comunicaEngine = null;
        let currentDotCode = '';

        const defaultSparqlQuery = `SELECT ?s ?p ?o
WHERE {
    ?s ?p ?o .
}`;

        let activeFilters = [...getFilterConfig(Mode).hiddenPredicates];
        let allPredicates = [];
