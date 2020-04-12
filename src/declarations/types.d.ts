


declare namespace IrcdKit {

    class Connection {
        id: number;
        nickname: null | string;
        username: string;
        realname: null | string;
        hostname: string;
        quitMessage: string;
        isAuthed: boolean;

        get mask(): string;

        send(asServer: boolean, ...args: string[]): void;
        send(...args: string[]): void;
        close(cb?: () => void): void;

        on(event: 'authenticated', listener: (username: string, user: any) => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
        on(event: 'end', listener: (connection: Connection, quitMessage: string) => void): this;
        on(event: 'close', listener: (connection: Connection, quitMessage: string) => void): this;
        on(event: 'user:quit', listener: (connection: Connection, quitMessage: string) => void): this;
        on(event: 'user:nick', listener: (newNickname: string, oldNickname: string) => void): this;
        on(event: 'PRIVMSG', listener: (channel: string, message: string) => void): this;
        on(event: 'PING', listener: (userAgent: string) => void): this;
        on(event: 'JOIN', listener: (channel: string) => void): this;
        on(event: 'CAP', listener: (subcommand: string, cap: string) => void): this;
        on(event: 'PASS', listener: (password: string) => void): this;
        on(event: 'PART', listener: (channel: string) => void): this;
    }

    class Server {
        _connections: Connection[];
        listen(port: number, address?: string, callback?: () => void): void;

        config(key: string): any;
        config(key: string, value: string): this;

        use(fn: (app: this) => void): this;

        close(cb?: () => void): void;
        handle(socket: import('net').Socket): void;

        getConnection(key: string, value: string): Connection;
        getConnection(value: string): Connection;
        createConnection(nickname: string): Connection;
        removeConnection(connection: Connection): void;

        get host(): string;

        on(event: 'connection', listener: (connection: Connection) => void): this;
        on(event: 'error', listener: (err: Error, client: Connection) => void): this;
        on(event: 'connection:end', listener: (client: Connection) => void): this;
    }
    function create(
        options: Partial<{
            name: string;
            version: string;
            created: Date;
            hostname: string;
            welcomeMessage: string;
            requireNickname: boolean;
            authTimeout: number;
            secure: {
                key: string;
                cert: string;
            };
            validateAuthentication: (
                connection: Connection,
                username: string,
                accept: (user: any) => void,
                reject: (message: string) => void,
                waitForPass: (fn: (password: string) => void) => void,
            ) => any;
            validateNickname: (
                connection: Connection,
                nickname: string,
                previous: string,
                accept: () => void,
                reject: (e: string) => void,
            ) => any;
            maxNickLength: number;
        }>,
    ): Server;
}
declare module 'ircdkit' {

    import create = IrcdKit.create;
    export = create;
}
