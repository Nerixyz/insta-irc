import { CommandInfo, CommandOption } from './types';


type CommandManagerBase = {__commands?: Array<Omit<CommandInfo, 'enabled'>>, __enabled?: (instance: any) => boolean};
export type CommandManagerClass = {constructor: Function & CommandManagerBase};

export function Command(name: string, ...options: Array<string | (Partial<CommandOption> & {name: string})>) {
    return function(target: CommandManagerClass, key: string) {
        if (!target.constructor.__commands) {
            target.constructor.__commands = [];
        }
        target.constructor.__commands.push({
            name,
            key,
            options: options.map(x => typeof x === 'string' ? ({ name: x, type: 'string' }) : {
                type: 'string',
                ...x
            })
        });
    }
}
type Class<T> = {new (...args: any[]): T};
export function Restricted<T>(enabled: (instance: T) => boolean) {
    return function(target: Class<T> & CommandManagerBase) {
        target.__enabled = enabled;
    }
}
