/** Общие типы и объявления браузерных библиотек RDF Grapher. */
type VisualizationMode = 'notation' | 'base' | 'aggregation' | 'vad';
type Prefixes = Record<string, string>;

interface RdfTerm {
    value: string;
    termType: string;
}

interface RdfQuad {
    subject: RdfTerm;
    predicate: RdfTerm;
    object: RdfTerm;
}

interface VadValidationError {
    triple: string;
    position: string;
    value: string;
    message: string;
}

interface VadValidationResult {
    valid: boolean;
    errors: VadValidationError[];
}

interface UrlParams {
    rdf?: string;
    from?: string;
    to?: 'svg' | 'png';
    mode?: VisualizationMode;
}

declare const N3: any;
declare const Viz: any;
declare const Comunica: any;

interface Window {
    RdfGrapher: Record<string, any>;
}


const RdfGrapher: Record<string, any> = {};

function byId<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Не найден обязательный элемент #${id}`);
    return element as T;
}
