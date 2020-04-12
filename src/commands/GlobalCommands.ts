import { CommandLineManager } from '../CommandLineManager';
import { Command } from './decorators';
import { AdditionalCommandArgs } from './types';
import * as boxen from 'boxen';

export class GlobalCommands {
    constructor(private manager: CommandLineManager) {}

    @Command('create')
    async create([], { reply }: AdditionalCommandArgs) {
        const data = await this.manager.createStream();
        reply(
            `Created stream!\nYour stream url is:\n${boxen(data.rtmpInfo.url, {
                padding: 1,
            })}\nCopy your stream-key with "key".\nJoin the IRC-Channel \n${boxen(
                '#live on 127.0.0.1:6667',
            )}\n (no SSL) with your username (${this.manager.currentUser.username}).`,
        );
    }

    @Command('list')
    async listFeed([], {reply}: AdditionalCommandArgs) {
        const feed = await this.manager.ig.feed.reelsTray().request();
        if(!feed.broadcasts){
            reply('No users are live!');
        } else {
            reply('Users:\n' + feed.broadcasts.map(x => `\t${x.broadcast_owner.username} (${x.viewer_count} viewers)`).join('\n'));
            reply('Use "view <username>" to view a stream.');
        }
    }

    @Command('view', 'username')
    async view([username]:[string], {reply}: AdditionalCommandArgs) {
        const info = await this.manager.ig.feed.userStory(await this.manager.ig.user.getIdByUsername(username)).request();
        if(typeof info.broadcast !== 'object') {
            reply('The user is not live.');
            throw new Error('No broadcast found.');
        }
        // @ts-ignore -- missing definitions
        const broadcast: ReelsTrayFeedResponseBroadcastsItem = info.broadcast;
        await this.manager.view({broadcastId: broadcast.id});
    }
}


