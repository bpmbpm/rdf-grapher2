/** Группа журналирования: единая обёртка для вызовов функций приложения. */
namespace Logging {
    interface LogEntry {
        timestamp: string;
        group: string;
        functionName: string;
        status: 'запуск' | 'успех' | 'ошибка';
        durationMs?: number;
        details?: string;
    }

    const entries: LogEntry[] = [];

    function render(entry: LogEntry): void {
        if (typeof document === 'undefined') return;
        const output = document.getElementById('execution-log');
        if (!output) return;
        const line = document.createElement('div');
        line.className = `log-entry log-${entry.status}`;
        const duration = entry.durationMs === undefined ? '' : ` (${entry.durationMs.toFixed(1)} мс)`;
        const details = entry.details ? ` — ${entry.details}` : '';
        line.textContent = `[${entry.timestamp}] [${entry.group}] ${entry.functionName}: ${entry.status}${duration}${details}`;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    export function write(entry: LogEntry): void {
        entries.push(entry);
        render(entry);
    }

    export function entered(group: string, functionName: string): void {
        write({ timestamp: new Date().toLocaleTimeString(), group, functionName, status: 'запуск' });
    }

    export function clear(): void {
        entries.length = 0;
        if (typeof document === 'undefined') return;
        const output = document.getElementById('execution-log');
        if (output) output.innerHTML = '';
    }

    export function instrument(group: string, api: Record<string, any>): Record<string, any> {
        return Object.fromEntries(Object.entries(api).map(([functionName, fn]) => {
            if (typeof fn !== 'function') return [functionName, fn];
            return [functionName, (...args: unknown[]) => {
                const startedAt = performance.now();
                write({ timestamp: new Date().toLocaleTimeString(), group, functionName, status: 'запуск' });
                try {
                    const result = fn(...args);
                    if (result instanceof Promise) {
                        return result.then((value: unknown) => {
                            write({ timestamp: new Date().toLocaleTimeString(), group, functionName, status: 'успех', durationMs: performance.now() - startedAt });
                            return value;
                        }).catch((error: unknown) => {
                            write({ timestamp: new Date().toLocaleTimeString(), group, functionName, status: 'ошибка', durationMs: performance.now() - startedAt, details: String(error) });
                            throw error;
                        });
                    }
                    write({ timestamp: new Date().toLocaleTimeString(), group, functionName, status: 'успех', durationMs: performance.now() - startedAt });
                    return result;
                } catch (error) {
                    write({ timestamp: new Date().toLocaleTimeString(), group, functionName, status: 'ошибка', durationMs: performance.now() - startedAt, details: String(error) });
                    throw error;
                }
            }];
        }));
    }
}
