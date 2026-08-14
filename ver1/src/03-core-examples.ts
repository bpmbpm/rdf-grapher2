        // ФУНКЦИИ ЗАГРУЗКИ ПРИМЕРОВ
        // ============================================================================

        // @ts-nocheck — примеры перенесены дословно; чистое API ниже экспортируется через типизированный фасад.
        function loadExampleTurtle() {
            const exampleRdf = `# Пример RDF данных в формате Turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:john rdf:type foaf:Person ;
    foaf:name "John Doe" ;
    foaf:age 30 ;
    foaf:knows ex:jane, ex:bob .

ex:jane rdf:type foaf:Person ;
    foaf:name "Jane Smith" ;
    foaf:knows ex:john .

ex:bob rdf:type foaf:Person ;
    foaf:name "Bob Wilson" .

ex:company rdf:type foaf:Organization ;
    foaf:name "Example Corp" ;
    foaf:member ex:bob, ex:jane .`;

            document.getElementById('rdf-input').value = exampleRdf;
            document.getElementById('input-format').value = 'turtle';
            document.getElementById('visualization-mode').value = 'notation';
            updateModeDescription();
        }

        /**
         * Загружает пример VAD (Value Added Chain Diagram)
         */
        function loadExampleVAD() {
            const exampleVAD = `# Пример VAD (Value Added Chain Diagram)
# Цепочка добавленной стоимости с процессами и исполнителями

@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix vad: <http://example.org/vad#> .

# Материнский процесс (не отображается в VAD режиме)
vad:Process0 rdf:type vad:Process ;
    rdfs:label "Процесс 0" ;
    dcterms:description "Материнский процесс для всей цепочки" .

# Процесс 1
vad:Process1 rdf:type vad:Process ;
    rdfs:label "Процесс 1" ;
    dcterms:description "Первый процесс в цепочке добавленной стоимости" ;
    vad:hasExecutor vad:ExecutorGroup1 ;
    vad:hasParent vad:Process0 ;
    vad:hasNext vad:Process2 .

# Процесс 2
vad:Process2 rdf:type vad:Process ;
    rdfs:label "Процесс 2" ;
    dcterms:description "Второй процесс, выполняется после Процесса 1" ;
    vad:hasExecutor vad:ExecutorGroup2 ;
    vad:hasParent vad:Process0 ;
    vad:hasNext vad:Process3, vad:Process4 .

# Процесс 3
vad:Process3 rdf:type vad:Process ;
    rdfs:label "Процесс 3" ;
    dcterms:description "Третий процесс в цепочке" ;
    vad:hasExecutor vad:ExecutorGroup3 ;
    vad:hasParent vad:Process0 ;
    vad:hasNext vad:Process4 .

# Процесс 4
vad:Process4 rdf:type vad:Process ;
    rdfs:label "Процесс 4" ;
    dcterms:description "Четвёртый процесс в цепочке" ;
    vad:hasExecutor vad:ExecutorGroup4 ;
    vad:hasParent vad:Process0 ;
    vad:hasNext vad:Process5 .

# Процесс 5
vad:Process5 rdf:type vad:Process ;
    rdfs:label "Процесс 5" ;
    dcterms:description "Пятый процесс в цепочке" ;
    vad:hasExecutor vad:ExecutorGroup5 ;
    vad:hasParent vad:Process0 ;
    vad:hasNext vad:Process6 .

# Процесс 6
vad:Process6 rdf:type vad:Process ;
    rdfs:label "Процесс 6" ;
    dcterms:description "Шестой процесс в цепочке" ;
    vad:hasExecutor vad:ExecutorGroup6 ;
    vad:hasParent vad:Process0 ;
    vad:hasNext vad:Process7 .

# Процесс 7
vad:Process7 rdf:type vad:Process ;
    rdfs:label "Процесс 7" ;
    dcterms:description "Седьмой процесс в цепочке" ;
    vad:hasExecutor vad:ExecutorGroup7 ;
    vad:hasParent vad:Process0 ;
    vad:hasNext vad:Process8 .

# Процесс 8
vad:Process8 rdf:type vad:Process ;
    rdfs:label "Процесс 8" ;
    dcterms:description "Заключительный процесс в цепочке" ;
    vad:hasExecutor vad:ExecutorGroup8 ;
    vad:hasParent vad:Process0 .

# Группы исполнителей
vad:ExecutorGroup1 rdf:type vad:ExecutorGroup ;
    rdfs:label "Группа исполнителей процесса Процесс 1" ;
    vad:includes vad:Executor1 .

vad:ExecutorGroup2 rdf:type vad:ExecutorGroup ;
    rdfs:label "Группа исполнителей процесса Процесс 2" ;
    vad:includes vad:Executor1, vad:Executor2 .

vad:ExecutorGroup3 rdf:type vad:ExecutorGroup ;
    rdfs:label "Группа исполнителей процесса Процесс 3" ;
    vad:includes vad:Executor3 .

vad:ExecutorGroup4 rdf:type vad:ExecutorGroup ;
    rdfs:label "Группа исполнителей процесса Процесс 4" ;
    vad:includes vad:Executor3, vad:Executor4 .

vad:ExecutorGroup5 rdf:type vad:ExecutorGroup ;
    rdfs:label "Группа исполнителей процесса Процесс 5" ;
    vad:includes vad:Executor5, vad:Executor6 .

vad:ExecutorGroup6 rdf:type vad:ExecutorGroup ;
    rdfs:label "Группа исполнителей процесса Процесс 6" ;
    vad:includes vad:Executor7, vad:Executor8 .

vad:ExecutorGroup7 rdf:type vad:ExecutorGroup ;
    rdfs:label "Группа исполнителей процесса Процесс 7" ;
    vad:includes vad:Executor1, vad:Executor5 .

vad:ExecutorGroup8 rdf:type vad:ExecutorGroup ;
    rdfs:label "Группа исполнителей процесса Процесс 8" ;
    vad:includes vad:Executor2, vad:Executor7 .

# Исполнители
vad:Executor1 rdf:type vad:Executor ;
    rdfs:label "Исполнитель 1" .

vad:Executor2 rdf:type vad:Executor ;
    rdfs:label "Исполнитель 2" .

vad:Executor3 rdf:type vad:Executor ;
    rdfs:label "Исполнитель 3" .

vad:Executor4 rdf:type vad:Executor ;
    rdfs:label "Исполнитель 4" .

vad:Executor5 rdf:type vad:Executor ;
    rdfs:label "Исполнитель 5" .

vad:Executor6 rdf:type vad:Executor ;
    rdfs:label "Исполнитель 6" .

vad:Executor7 rdf:type vad:Executor ;
    rdfs:label "Исполнитель 7" .

vad:Executor8 rdf:type vad:Executor ;
    rdfs:label "Исполнитель 8" .`;

            document.getElementById('rdf-input').value = exampleVAD;
            document.getElementById('input-format').value = 'turtle';
            document.getElementById('visualization-mode').value = 'vad';
            updateModeDescription();
        }

        function loadExampleNTriples() {
            const exampleRdf = `<http://example.org/john> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Person> .
<http://example.org/john> <http://xmlns.com/foaf/0.1/name> "John Doe" .
<http://example.org/john> <http://xmlns.com/foaf/0.1/knows> <http://example.org/jane> .
<http://example.org/jane> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Person> .
<http://example.org/jane> <http://xmlns.com/foaf/0.1/name> "Jane Smith" .`;

            document.getElementById('rdf-input').value = exampleRdf;
            document.getElementById('input-format').value = 'n-triples';
            document.getElementById('visualization-mode').value = 'notation';
            updateModeDescription();
        }

        /**
         * Загружает пример RDF данных в формате N-Quads
         */
        function loadExampleNQuads() {
            const exampleRdf = `# Пример RDF данных в формате N-Quads
# Формат: субъект предикат объект граф .
# N-Quads расширяет N-Triples добавлением именованных графов
<http://example.org/john> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Person> <http://example.org/people> .
<http://example.org/john> <http://xmlns.com/foaf/0.1/name> "John Doe" <http://example.org/people> .
<http://example.org/john> <http://xmlns.com/foaf/0.1/knows> <http://example.org/jane> <http://example.org/people> .
<http://example.org/jane> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Person> <http://example.org/people> .
<http://example.org/jane> <http://xmlns.com/foaf/0.1/name> "Jane Smith" <http://example.org/people> .
<http://example.org/company> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Organization> <http://example.org/organizations> .
<http://example.org/company> <http://xmlns.com/foaf/0.1/name> "Example Corp" <http://example.org/organizations> .
<http://example.org/company> <http://xmlns.com/foaf/0.1/member> <http://example.org/john> <http://example.org/organizations> .`;

            document.getElementById('rdf-input').value = exampleRdf;
            document.getElementById('input-format').value = 'n-quads';
            document.getElementById('visualization-mode').value = 'notation';
            updateModeDescription();
        }

        /**
         * Загружает пример RDF данных в формате TriG
         */
        function loadExampleTriG() {
            const exampleRdf = `# Пример RDF данных в формате TriG
# TriG расширяет Turtle добавлением именованных графов
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Граф с информацией о людях
ex:people {
    ex:john rdf:type foaf:Person ;
        foaf:name "John Doe" ;
        foaf:knows ex:jane .

    ex:jane rdf:type foaf:Person ;
        foaf:name "Jane Smith" ;
        foaf:knows ex:john .
}

# Граф с информацией об организациях
ex:organizations {
    ex:company rdf:type foaf:Organization ;
        foaf:name "Example Corp" ;
        foaf:member ex:john, ex:jane .
}`;

            document.getElementById('rdf-input').value = exampleRdf;
            document.getElementById('input-format').value = 'trig';
            document.getElementById('visualization-mode').value = 'notation';
            updateModeDescription();
        }

        /**
         * Для обратной совместимости: вызывает загрузку примера Turtle
         */
        function loadExample() {
            loadExampleTurtle();
        }

        // ============================================================================
        // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С URI
        // ============================================================================

        function getLocalName(uri) {
            if (typeof uri !== 'string') return String(uri);
            const hashIndex = uri.lastIndexOf('#');
            const slashIndex = uri.lastIndexOf('/');
            const splitIndex = Math.max(hashIndex, slashIndex);
            if (splitIndex !== -1 && splitIndex < uri.length - 1) {
                return uri.substring(splitIndex + 1);
            }
            return uri;
        }

        function getPrefixedName(uri, prefixes) {
            if (typeof uri !== 'string') return String(uri);
            const orderedPrefixes = Object.entries(prefixes)
                .sort((left, right) => String(right[1]).length - String(left[1]).length);
            for (const [prefix, namespace] of orderedPrefixes) {
                if (uri.startsWith(namespace)) {
                    const localName = uri.substring(namespace.length);
                    return prefix + ':' + localName;
                }
            }
            return getLocalName(uri);
        }

        function escapeDotString(str) {
            return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        }

        function generateNodeId(value) {
            let hash = 0;
            for (let i = 0; i < value.length; i++) {
                const char = value.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return 'node' + Math.abs(hash);
        }

        /**
         * Генерирует ID узла для VAD режима на основе RDF идентификатора.
         * Преобразует prefixed name (например, vad:Process1) в валидный DOT ID (vad_Process1).
         * @param {string} uri - URI узла
         * @param {Object} prefixes - Словарь префиксов
         * @returns {string} - Валидный DOT ID
         */
        function generateVadNodeId(uri, prefixes) {
            const prefixedName = getPrefixedName(uri, prefixes);
            // Заменяем ':' на '_' для получения валидного DOT ID
            // Также заменяем другие недопустимые символы на '_'
            return prefixedName.replace(/[:\-\.\s]/g, '_');
        }

        function isNameOrLabelPredicate(predicateLabel) {
            const lowerPredicate = predicateLabel.toLowerCase();
            return lowerPredicate.includes('name') || lowerPredicate.includes('label');
        }

        function escapeHtmlLabel(str) {
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        /**
         * Экранирует HTML символы для безопасного отображения
         * @param {string} text - Исходный текст
         * @returns {string} - Экранированный текст
         */
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function wrapTextByWords(text, maxLength) {
            if (!text || text.length <= maxLength) return [text];
            const words = text.split(/\s+/);
            const lines = [];
            let currentLine = '';
            for (const word of words) {
                if (currentLine.length === 0) {
                    currentLine = word;
                } else if (currentLine.length + 1 + word.length <= maxLength) {
                    currentLine += ' ' + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine.length > 0) lines.push(currentLine);
            return lines;
        }

        function formatLabelWithWrap(label, maxLength, isBold = false) {
            const lines = wrapTextByWords(label, maxLength);
            const needsWrap = lines.length > 1;
            if (!needsWrap) {
                if (isBold) return `<B>${escapeHtmlLabel(label)}</B>`;
                return escapeHtmlLabel(label);
            }
            let result = '';
            for (let i = 0; i < lines.length; i++) {
                if (i > 0) result += '<BR/>';
                const escapedLine = escapeHtmlLabel(lines[i]);
                if (isBold) {
                    result += `<FONT POINT-SIZE="9"><B>${escapedLine}</B></FONT>`;
                } else {
                    result += `<FONT POINT-SIZE="9">${escapedLine}</FONT>`;
                }
            }
            return result;
        }
