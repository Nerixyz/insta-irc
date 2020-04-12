import { EventEmitter } from 'events';
import Connection = IrcdKit.Connection;
import ircdkit = require('ircdkit');
import Server = IrcdKit.Server;
import { pull } from 'lodash';
import { IrcChannel } from './IrcChannel';

export interface IgIrcOptions {
    validUsers: string[];
}

export class IrcServer extends EventEmitter {
    connections: Connection[] = [];
    server: Server;
    options: IgIrcOptions;
    channels: IrcChannel[] = [];

    constructor() {
        super();
    }

    start(options: IgIrcOptions): void {
        this.options = options;
        this.server = ircdkit({
            name: 'InstaJS',
            version: '0.1',
            hostname: 'localhost',
            maxNickLength: 20,
            validateNickname: (connection, nickname, previous, accept, reject) =>
                this.options.validUsers.includes(nickname) ? accept() : reject('Invalid Nick'),
            validateAuthentication: (connection, username, accept, reject) =>
                this.options.validUsers.includes(username) ? accept({ username }) : reject('Invalid username.'),
        }).on('connection', connection => this.onConnection(connection));
        this.server.listen(6667);
    }

    stop() {
        this.server.close();
    }

    openChannel(name: string): IrcChannel {
        let channel = this.channels.find(x => x.name === name);
        if(channel)
            return channel;

        channel = new IrcChannel(name);
        this.channels.push(channel);
        return channel;
    }

    addValidUser(name: string) {
        this.options.validUsers.push(name);
    }

    closeChannel(channel: string | IrcChannel): void {
        let target;
        if (typeof channel === 'string')
            target = this.channels.find(x => x.name === channel);
        else
            target = channel;
        if(!target)
            throw new Error('Invalid channel');

        // TODO: notify clients
        this.channels = pull(this.channels, target);
    }

    onConnection(connection: Connection) {
        connection
            .on('close', () => (this.connections = pull(this.connections, connection)))
            .on('end', () => (this.connections = pull(this.connections, connection)))
            .on('authenticated', () => this.connections.push(connection))
            .on('PING', ua => {
                connection.send(true, 'PONG', ua);
            })
            .on('JOIN', channel => {
                const target = this.channels.find(x => x.name === channel);
                if(!target) {
                    this.sendToClient(connection, 'This channel is not enabled.', channel);
                    return;
                }
                target.addConnection(connection);
            })
            .on('PART', channel => {
                const target = this.channels.find(x => x.name === channel);
                if (target) {
                    target.removeConnection(connection);
                }
            })
            .on('CAP', () => {
            });
    }

    sendToClient(target: Connection, message: string, channel: string) {
        for (const part of message.split(/[\n\r]/)) {
            target.send(true, 'PRIVMSG', `${channel} :${part}`);
        }
    }

}
