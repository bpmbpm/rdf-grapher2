const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync('ver1/dist/app.js', 'utf8');
const context = { console, URLSearchParams };
vm.createContext(context);
vm.runInContext(source, context);

const term = (value, termType = 'NamedNode') => ({ value, termType });
const quad = (subject, predicate, object, objectType = 'NamedNode') => ({
  subject: term(subject),
  predicate: term(predicate),
  object: term(object, objectType)
});

test('getPrefixedName выбирает самый длинный подходящий namespace', () => {
  assert.equal(
    context.RdfGrapher.core.getPrefixedName('https://example.org/vad#Process', {
      ex: 'https://example.org/',
      vad: 'https://example.org/vad#'
    }),
    'vad:Process'
  );
});

test('validateVAD принимает корректную VAD-модель', () => {
  const quads = [
    quad('https://example.org/p1', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://example.org/vad#Process'),
    quad('https://example.org/p1', 'http://www.w3.org/2000/01/rdf-schema#label', 'Приём заказа', 'Literal')
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.RdfGrapher.validation.validateVAD(quads, {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      vad: 'http://example.org/vad#'
    }))),
    { valid: true, errors: [] }
  );
});

test('validateVAD сообщает запрещённые предикат и тип', () => {
  const quads = [
    quad('https://example.org/p1', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'https://example.org/Unknown'),
    quad('https://example.org/p1', 'https://example.org/unsupported', 'x', 'Literal')
  ];
  const result = context.RdfGrapher.validation.validateVAD(quads, {
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    ex: 'https://example.org/'
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0].message, /Недопустимый тип/);
  assert.match(result.errors[1].message, /Недопустимый предикат/);
});

test('parseUrlParams предпочитает hash и отбрасывает неизвестные значения', () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.RdfGrapher.core.parseUrlParams(
      '?from=nt&to=png',
      '#rdf=a%20b&from=trig&to=bad&mode=vad'
    ))),
    { rdf: 'a b', from: 'trig', mode: 'vad' }
  );
});

test('wrapTextByWords не теряет слова и соблюдает мягкий предел', () => {
  assert.deepEqual(
    Array.from(context.RdfGrapher.core.wrapTextByWords('один два три четыре', 9)),
    ['один два', 'три', 'четыре']
  );
});
