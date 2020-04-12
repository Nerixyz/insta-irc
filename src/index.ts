import { createDirectories, loadStateFor, loadStateRaw, saveStateFor, spinPromise } from './utilities';
import { omit } from 'lodash';
import { CommandLineManager } from './CommandLineManager';
import { promises } from 'fs';
import * as prompts from 'prompts';
import {
    IgApiClient,
    IgCheckpointError,
    IgLoginTwoFactorRequiredError,
    IgResponseError,
} from 'instagram-private-api';

const ig = new IgApiClient();
let broadcastId: string | undefined = undefined;

(async () => {

    console.log('Welcome to my cool project 😎!');

    const [state, username] = await spinPromise('Loading files', async () => {
        await createDirectories();
        let state;
        let username;
        const stateDir = await promises.readdir('./state');
        if(stateDir.length === 1) {
            state = await loadStateRaw(stateDir[0]);
            username = state?.username;
        } else {
            username = await promptUsername();
            state = await loadStateFor(username);
        }
        if(!username) {
            username = await promptUsername();
        }

        if (!state) {
            state = {
                ig: undefined,
                username,
            };
        }
        return [state, username];
    });

    const currentUser = await spinPromise('Logging in', async () => {
        ig.request.end$.subscribe(async ()=>
            saveStateFor(username, {
                ig: JSON.stringify(omit(await ig.state.serialize(), 'constants')),
                broadcastId,
                username,
            }));
        await ig.state.deserialize(state.ig ||'{}');
        ig.state.generateDevice(username);

        let res;
        try {
            res = await ig.account.currentUser();
        } catch (e) {
           res = await logIn(username, await promptPassword());
        }
        if(!res.username) {
            res = await ig.account.currentUser();
        }
        return res;
    });

    const manager = new CommandLineManager(ig, currentUser);
    await manager.startLoop();
})().catch(console.error);

async function promptUsername(): Promise<string> {
    return (await prompts({
        name: 'username',
        type: 'text',
        message: 'Username'
    })).username;
}

async function promptPassword(): Promise<string> {
    return (await prompts({
        name: 'password',
        type: 'password',
        message: 'Password'
    })).password;
}

async function promptCode(method: string): Promise<string> {
    return (await prompts({
        name: 'code',
        type: 'text',
        message: `Enter the code you received via ${method}`
    })).code;
}

async function logIn(username: string, password: string) {
    // two timer - there could be a checkpoint AND 2FA
    return ig.account.login(username, password).catch(handleError).catch(handleError);
}

async function handleError(e: IgResponseError): Promise<{username: string}> {
    if(e instanceof IgCheckpointError) {
        await ig.challenge.auto(true);
        const code = await promptCode('Email/SMS');
        const loggedIn = (await ig.challenge.sendSecurityCode(code)).logged_in_user;
        if(!loggedIn)
            return ig.account.currentUser();
        return loggedIn;
    } else if(e instanceof IgLoginTwoFactorRequiredError) {
        const twoFactorInfo = e.response.body.two_factor_info;
        const verificationMethod = twoFactorInfo.totp_two_factor_on ? 'TOTP' : 'SMS';
        const code = await promptCode(verificationMethod);
        return ig.account.twoFactorLogin({
            verificationMethod,
            verificationCode:code,
            trustThisDevice: '1',
            twoFactorIdentifier: twoFactorInfo.two_factor_identifier,
            username: twoFactorInfo.username,
        });
    } else {
        throw e;
    }
}

