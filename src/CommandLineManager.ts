import { InstaStream, InstaStreamStatus } from './InstaStream';
import { IrcServer } from './irc/IrcServer';
import { AssertionError } from 'assert';
import { CommandPipeline } from './commands/CommandPipeline';
import * as prompts from 'prompts';
import { BaseUser } from './types';
import { IgApiClient } from 'instagram-private-api';

export class CommandLineManager {

    currentStream?: InstaStream;
    ircServer: IrcServer;
    commands = new CommandPipeline(this);


    constructor(public ig: IgApiClient, public currentUser: BaseUser) {
        this.ircServer = new IrcServer();
        this.ircServer.start({
            validUsers: [],
        });
    }

    async createStream() {
        if(this.currentStream?.isActive)
            throw new AssertionError({message: 'Stream is still active!'});

        const ircChannel = this.ircServer.openChannel('live');
        this.ircServer.addValidUser(this.currentUser.username);
        this.currentStream =  new InstaStream(this.ig, ircChannel, this.commands, {loggedInUsername: this.currentUser.username});
        this.commands.updateStream(this.currentStream);
        this.currentStream.on('stop', () => {
            // @ts-ignore -- force
            this.commands.updateStream(undefined);
        });
        return this.currentStream.create({
            previewWidth: 720,
            previewHeight: 1280,
            message: 'New stream, come and join!',
        });
    }

    async view(options: {broadcastId: string}) {
        if(this.currentStream?.isActive)
            throw new AssertionError({message: 'Stream is still active!'});

        const ircChannel = this.ircServer.openChannel('live');
        this.ircServer.addValidUser(this.currentUser.username);
        this.currentStream =  new InstaStream(this.ig, ircChannel, this.commands, {loggedInUsername: this.currentUser.username});
        this.commands.updateStream(this.currentStream);
        this.currentStream.on('stop', () => {
            // @ts-ignore -- force
            this.commands.updateStream(undefined);
        });
        return this.currentStream.view(options);
    }

    async startLoop() {
       while(true) {
           const { nextLine } = await prompts({
               name: 'nextLine',
               message: '',
               type: 'text'
           });
           if(nextLine === '!exit') {
               console.log('Bye!');
               break;
           }
           await this.commands.onCommand(nextLine, message => console.log(message));
       }
       this.ircServer.stop();
    }

}
