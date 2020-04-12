import { EventEmitter } from 'events';
import { clearInterval } from 'timers';
import { IgApiClient, LiveCommentsResponseRootObject } from 'instagram-private-api';
import { GraphQLSubscriptions, RealtimeClient } from 'instagram_mqtt';

export interface MessageInfo {
    isSystem: boolean;
    user: string;
    text: string;
}

export interface ChatService extends EventEmitter {
    on(event: 'message', listener: (message: MessageInfo) => void): this;
    start(): Promise<void>;
    stop(): Promise<void>;
}

export class RealtimeChatService extends EventEmitter implements ChatService {

    constructor(protected realtime: RealtimeClient, protected broadcastId: string) {
        super();
    }

    async start(): Promise<void> {
        await this.realtime.connect({
            graphQlSubs: [
                GraphQLSubscriptions.getLiveRealtimeCommentsSubscription(this.broadcastId),
                GraphQLSubscriptions.getLiveTypingIndicatorSubscription(this.broadcastId),
            ]
        });
        this.realtime.on('liveRealtimeComments',(data: any) => {
            const event: LiveCommentsResponseRootObject = data.live_video_comment_event;
            if(event.comments) {
                for(const comment of event.comments) {
                    this.emit('message', {
                        isSystem: false,
                        user: comment.user.username,
                        text: comment.text,
                    });
                }
            }
            if(event.system_comments) {
                for(const comment of event.system_comments) {
                    this.emit('message', {
                        isSystem: true,
                        user: 'system',
                        text: comment.text,
                    });
                }
            }
        });
    }

    async stop(): Promise<void> {
        await this.realtime.disconnect();
    }

}

export class HttpChatService extends EventEmitter implements ChatService {

    protected timerRef: any;
    protected lastCommentTs: string | number = 0;

    constructor(protected ig: IgApiClient, protected broadcastId: string, protected heartbeatDelay: number) {
        super();
    }
    async start(): Promise<void> {
        this.timerRef = setInterval(async () => {
            const comments = await this.ig.live.getComment({
                broadcastId: this.broadcastId,
                lastCommentTs: this.lastCommentTs
            });
            if(comments.comments) {
                for(const comment of comments.comments) {
                    this.emit('message', {
                        isSystem: false,
                        user: comment.user.username,
                        text: comment.text,
                    });
                    this.lastCommentTs = Math.max(Number(this.lastCommentTs), Number(comment.created_at));
                }
            }
            if(comments.system_comments) {
                for(const comment of comments.system_comments) {
                    this.emit('message', {
                        isSystem: true,
                        user: 'system',
                        text: comment.text,
                    });
                    this.lastCommentTs = Math.max(Number(this.lastCommentTs), Number(comment.created_at));
                }
            }
        }, this.heartbeatDelay);
        return;
    }

    async stop(): Promise<void> {
        clearInterval(this.timerRef);
        return;
    }

}
