import { EventEmitter } from 'events';
import Connection = IrcdKit.Connection;
import { pull } from 'lodash';

export class IrcChannel extends EventEmitter {

    protected connections: Connection[] = [];

    constructor(public name: string) {
        super();
        if(name[0] !== '#') {
            this.name = '#' + name;
        }
    }

    public addConnection(connection: Connection): void {
        this.connections.push(connection.on('PRIVMSG', (channel, message) => {
            if(channel === this.name)
                this.emit('message', connection.nickname ?? connection.username, message);
        }));
    }

    public removeConnection(connection: Connection): void {
        this.connections = pull(this.connections, connection);
    }

    public send(author: string, message: string) {
        const mask = `${author}!${author}@igLive`;
        const messageParts = message.split(/[\r\n]/g);
        for (const part of messageParts) {
            const msg = `:${mask} PRIVMSG ${this.name} :${part}`;
            this.connections.forEach(c => c.send(msg));
        }
    }
}
