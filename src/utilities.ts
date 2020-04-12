import clipboardy = require('clipboardy');
import { promises } from 'fs';
import { InstaStreamState } from './types';
import { createHash } from 'crypto';
import * as ora from 'ora';
import { AssertionError } from 'assert';
import * as childProcess from 'child_process';
import debug from 'debug';

export function copyToClipboard(text: string): Promise<void> {
    return clipboardy.write(text);
}

export async function createDirectories(): Promise<void> {
    return await promises.access('./state').catch(() => promises.mkdir('./state'));
}

export async function loadStateFor(name: string): Promise<InstaStreamState | undefined> {
    const nameHash = hash(name);
    return loadStateRaw(`${nameHash}.json`);
}

export async function loadStateRaw(fileName: string): Promise<InstaStreamState | undefined> {
    const filePath = `./state/${fileName}`;
    return await promises
        .access(filePath)
        .then(() => promises.readFile(filePath, { encoding: 'utf8' }).then(data => JSON.parse(data)))
        .catch(() => undefined);
}

export async function saveStateFor(name: string, data: object): Promise<void> {
    const nameHash = hash(name);
    const filePath = `./state/${nameHash}.json`;
    await promises.writeFile(filePath, JSON.stringify(data));
}

function hash(data: string): string {
    return createHash('md5')
        .update(data ?? '')
        .digest()
        .toString('hex');
}

export async function spinPromise<T>(text: string, work: () => Promise<T>): Promise<T> {
    const spinner = ora({ text });
    spinner.start();
    const result = await work();
    spinner.stop();
    return result;
}

export function assert(condition: any, message?: string): condition is true {
    const bool = !!condition;
    if (!bool) {
        throw new AssertionError({ message: message ?? 'Assertion failed!' });
    }
    return bool;
}

const execDebug= debug('instastream:exec');

export async function openInVlc(url: string): Promise<void> {
    try {
        await execAsync(`vlc "${url}"`);
        return;
    } catch (e) {
        // ignore
        execDebug(`Failed to execute vlc: ${e}\n${e?.stack}`);
    }
    const platform = process.platform;
    if (platform === 'win32') {
        await execAsync(`"C:\\Program Files\\VideoLAN\\VLC\\vlc.exe" "${url}"`);
    } else {
        throw new Error('VLC is not in PATH. Add vlc to PATH!');
    }
}

function execAsync(cmd: string): Promise<[string, string]> {
    return new Promise<[string, string]>((resolve, reject) => {
        childProcess.exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve([stdout, stderr]);
            }
        });
    });
}



