import { EventEmitter } from 'events';
import { ChatService, HttpChatService, MessageInfo, RealtimeChatService } from './ChatService';
import debug from 'debug';
import { IrcChannel } from './irc/IrcChannel';
import { CommandPipeline } from './commands/CommandPipeline';
import Connection = IrcdKit.Connection;
import { assert } from './utilities';
import { InstaStreamState } from './types';
import { RealtimeClient } from 'instagram_mqtt';
import { IgApiClient } from 'instagram-private-api';

export interface InstaStreamOptions {
    loggedInUsername: string
}

export enum InstaStreamStatus {
    Invalid = -1,
    Created,
    Ongoing,
    Stopped,
}

export interface InstaStreamRtmpInfo {
    url: string,
    key: string,
}

export interface InstaStreamInformation {
    rtmpInfo: InstaStreamRtmpInfo;
    broadcastId: string;
    mediaId?: string;
    status: InstaStreamStatus;
    isOwner: boolean;
    dashPlaybackUrl: string;
}
export declare interface InstaStream {
    on(event: 'message', listener: (message: MessageInfo) => void): this;
    on(event: 'stop', listener: () => void): this;
}

export class InstaStream extends EventEmitter {

    protected streamDebug = debug('instastream:main');

    protected session: InstaStreamInformation;
    public realtime: RealtimeClient;
    protected chatService: ChatService;

    get status(): InstaStreamStatus {
        return this.session?.status ?? InstaStreamStatus.Invalid;
    }

    get rtmpInfo(): InstaStreamRtmpInfo {
        return this.session.rtmpInfo;
    }

    get isActive(): boolean {
        return [InstaStreamStatus.Ongoing, InstaStreamStatus.Created].includes(this.status);
    }

    get isOwned(): boolean {
        return this.session?.isOwner;
    }

    get dashPlaybackUrl(): string {
        return this.session.dashPlaybackUrl;
    }

    public constructor(public client: IgApiClient, public ircChannel: IrcChannel, private commandPipeline: CommandPipeline,public options: InstaStreamOptions ) {
        super();
        this.realtime = new RealtimeClient(this.client);
        this.setupIrc();
    }
    protected setupIrc() {
        this.ircChannel.on('message', async (author: Connection, data: string) => {
            try {
                if (data.startsWith('.')) {
                    if (data.startsWith('..')) {
                        data = data.substring(2);
                    } else {
                        await this.commandPipeline.onCommand(data.substring(1), msg => this.ircChannel.send('system', msg));
                        return;
                    }
                }
                await this.client.live.comment(this.session.broadcastId, data);
            }catch (e) {
                this.streamDebug(`Error on IRC Message; message: ${data} error: ${e}\n${e.stack}`);
            }
        });
    }

    public async create(options: { previewWidth: number, previewHeight: number, message: string }): Promise<InstaStreamInformation> {
        this.streamDebug('Creating livestream...');
        const live = await this.client.live.create({
            ...options,
        });
        const info = await this.client.live.info(live.broadcast_id);
        //TODO: facebook url
        const [streamUrl, preKey] = live.upload_url.split(live.broadcast_id);
        this.session = {
            rtmpInfo: {
                url: streamUrl,
                key: live.broadcast_id + preKey,
            },
            broadcastId: live.broadcast_id,
            status: InstaStreamStatus.Created,
            dashPlaybackUrl: info.dash_playback_url,
            isOwner: true,
        };
        this.streamDebug(`Created livestream on ${streamUrl} with ${live.broadcast_id}.`);
        return this.session;
    }

    public async view(options: {broadcastId: string}): Promise<InstaStreamInformation> {
        const info = await this.client.live.info(options.broadcastId);
        this.session = {
            broadcastId:options.broadcastId,
            rtmpInfo: {url: info.rtmp_playback_url, key: ''},
            status: InstaStreamStatus.Ongoing,
            dashPlaybackUrl: info.dash_playback_url,
            isOwner: false,
        };
        return this.session;
    }

    public async start(): Promise<void> {
        this.streamDebug('Starting livestream...');
        assert(this.isOwned);
        const {media_id} = await this.client.live.start(this.session.broadcastId, true);
        await this.startChatService();
        this.session.mediaId = media_id;
        this.session.status = InstaStreamStatus.Ongoing;
        this.streamDebug('Started livestream.');
    }

    public async stop(asHighlight: boolean): Promise<void> {
        this.streamDebug('Stopping livestream...');
        assert(this.isOwned);
        await this.client.live.endBroadcast(this.session.broadcastId, false);
        this.emit('stop');
        this.session.status = InstaStreamStatus.Stopped;
        await this.chatService.stop();
        if(asHighlight) {
            this.streamDebug('Adding livestream to post live...');
            await this.client.live.addToPostLive(this.session.broadcastId);
        }
        this.streamDebug('Stopped livestream.');
    }

    protected async startChatService() {
        this.streamDebug('Starting chat service...');
        try {
            this.chatService = new RealtimeChatService(this.realtime, this.session.broadcastId);
            await this.chatService.start();
            this.streamDebug('Using realtime chat service.');
        } catch(e) {
            this.chatService = new HttpChatService(this.client, this.session.broadcastId, 2000);
            await this.chatService.start();
            this.streamDebug(`Using http chat service: ${e}`);
        }
        this.chatService.on('message', message => {
            this.emit('message', message);
            if(message.user !== this.options.loggedInUsername)
                this.ircChannel.send(message.isSystem ? 'system' : message.user, message.text);
        });
    }
}
