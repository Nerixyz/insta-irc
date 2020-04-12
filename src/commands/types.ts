
export interface AdditionalCommandArgs {
    reply: (message: string) => void;
}

export interface CommandInfo {
    name: string;
    key: string;
    options: CommandOption[];
    enabled: () => boolean;
}

export interface CommandOption {
    name: string;
    type: 'string' | 'flag' | 'number'
}
