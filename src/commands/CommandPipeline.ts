import { GlobalCommands } from './GlobalCommands';
import { StreamCommands } from './StreamCommands';
import { InstaStream } from '../InstaStream';
import { AdditionalCommandArgs, CommandInfo, CommandOption } from './types';
import { CommandLineManager } from '../CommandLineManager';
import { CommandManagerClass } from './decorators';
import debug from 'debug';
export type CommandExecuteFunction = (args: Array<string | number | boolean>, additional: AdditionalCommandArgs) => Promise<void>;
export type RegisteredCommand = {
    name: string;
    enabled: () => boolean;
    options: CommandOption[];
    execute: CommandExecuteFunction;
}
export class CommandPipeline {
    protected commandDebug = debug('instastream:command');
    streamCommands: StreamCommands;

    registeredCommands: RegisteredCommand[] = [];

    constructor(protected manager: CommandLineManager) {
        [new GlobalCommands(manager), (this.streamCommands = new StreamCommands())].forEach((i: CommandManagerClass) =>
            this.registeredCommands.push(
                ...(i.constructor.__commands?.map(value => ({
                    name: value.name,
                    options: value.options,
                    enabled: i.constructor.__enabled ? () => !!i.constructor.__enabled?.(i) : () => true,
                    // @ts-ignore -- i[key] is a function
                    execute: (...args: any[]) => i[value.key](...args),
                })) ?? []),
            ),
        );
        this.registeredCommands.push({
            name: 'help',
            options: [],
            enabled: () => true,
            execute: async ([], {reply}) => reply('Available commands:\n'+this.registeredCommands.map(makeSyntax).join('\n'))
        });
    }

    updateStream(stream: InstaStream) {
        this.streamCommands.stream = stream;
    }

    /**
     * Assume the message is "command arg1 arg2 -flag1"
     * @param {string} message
     * @param reply
     */
    async onCommand(message: string, reply: (message: string) => void): Promise<void> {
            const [name, ...args] = tokenize(message);
            const command = this.registeredCommands.find(x => x.name === name);
            if(!command || !command.enabled()) {
                reply('Command not found.');
                return;
            }
            const parsedArgs = [];
            try {
                let diff = 0;
                for (let i = 0; i < command.options.length; i++) {
                    const current = command.options[i];
                    const argIndex = i - diff;
                    switch (current.type) {
                        case 'string': {
                            parsedArgs.push(args[argIndex]);
                            break;
                        }
                        case 'flag': {
                            if (args.length < argIndex || !(args[argIndex]?.charAt(0) === '-')) {
                                parsedArgs.push(false);
                                diff++;
                            } else {
                                const present = args[argIndex].substring(1) === current.name;
                                diff += Number(!present);
                                parsedArgs.push(present);
                            }
                            break;
                        }
                        case 'number': {
                            parsedArgs.push(Number(args[argIndex]));
                            break;
                        }
                    }
                }
            }catch (e) {
                reply(`Failed to parse the command; Syntax: ${makeSyntax(command)}`);
                this.commandDebug(`Parse error: ${e}\n${e?.stack}`);
                return;
            }
            try {
                await command.execute(parsedArgs, {reply});
            } catch(e) {
                reply('Failed to execute command.');
                this.commandDebug(`Exec error: ${e}\n${e?.stack}`);
            }
    }
}

function makeSyntax(command: RegisteredCommand): string {
    return [command.name, ...command.options.map(x => {
        switch (x.type) {
            case 'number':
            case 'string':
                return `<${x.name}>`;
            case 'flag':
                return `[-${x.name}]`;
        }
    })].join(' ');
}

function readUntil(str: string, start: number, stop: string): [string, number] {
    let buffer = '';
    let escaped = false;
    for(let i = start; i < str.length; i++) {
        const current = str.charAt(i);
        if(!escaped && current === stop)
            return [buffer, i];
        else if(escaped) {
            buffer += current;
            escaped = false;
        }
        else if(/["']/.exec(current)) {
            i++;
            const [res, mod] = readUntil(str, i, current);
            buffer += res;
            i = mod;
        }
        else if(current === '\\') {
            escaped = true;
        }else {
            buffer += current;
        }
    }
    return [buffer, str.length];
}

function tokenize(target: string): string[] {
    const results = [];
    for(let i = 0; i < target.length; i++) {
        const [res, mod] = readUntil(target, i, ' ');
        results.push(res);
        i = mod;
    }
    return results;
}
