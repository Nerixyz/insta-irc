import { InstaStream, InstaStreamStatus } from '../InstaStream';
import { AdditionalCommandArgs } from './types';
import { Command, Restricted } from './decorators';
import { copyToClipboard, openInVlc } from '../utilities';

@Restricted<StreamCommands>(instance => instance.active)
export class StreamCommands {
    public stream: InstaStream;

    public constructor() {}

    get active(): boolean {
        return this.stream?.status !== InstaStreamStatus.Stopped;
    }

    @Command('stop', { name: 'highlight', type: 'flag' })
    async stop([highlight]: [boolean], { reply }: AdditionalCommandArgs) {
        await this.stream.stop(highlight);
        reply('Stopped stream!');
    }

    @Command('start')
    async start([], { reply }: AdditionalCommandArgs) {
        await this.stream.start();
        reply('Started stream!');
    }

    @Command('url')
    async copyUrl([], { reply }: AdditionalCommandArgs) {
        await copyToClipboard(this.stream.rtmpInfo.url);
        reply('Copied to clipboard!');
    }

    @Command('key')
    async copyKey([], {reply}:AdditionalCommandArgs) {
        await copyToClipboard(this.stream.rtmpInfo.key);
        reply('Copied to clipboard!');
    }

    @Command('vlc')
    async openInVlc([], {reply}: AdditionalCommandArgs) {
        await openInVlc(this.stream.dashPlaybackUrl);
        reply('Opened.');
    }
}
