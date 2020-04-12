# InstaIrc

This smol app is a too for livestreaming on Instagram.
It's a command line app going hand in hand with [Chatterino](https://github.com/Chatterino/chatterino2).
Although Chatterino is intended for Twitch, it has got (currently in beta) IRC support.
So this app starts a local IRC-Server for Chatterino to connect to.
The IRC is (currently) limited, but there is basic chat support.

# How to use

[DemoVideo](https://www.youtube.com/watch?v=4YpJzgou-Pw)

You have to have [Node](https://nodejs.org/) installed.

Clone the project and run this command:
```
npm i && npm run start
```
If you want to start this a second time, use `node .`

## Debugging
Set the environment variable `DEBUG` to `instastream:*`.

# Commands

## `create`
Creates a stream for you.

## `list`
List all streams from your feed.

## `start`
Starts the stream.

## `view`
Usage: `view <username>`

View a stream.

## `stop`
Stops a stream (optional: pass `-highlight` to save the stream as a highlight).

## `url`
Copy the url.

## `key`
Copy the stream-key.

## `vlc`
Open the stream in VLC (requires Windows or the vlc-directory in `PATH`).

## `help`
List all commands.


# Missing Features

- Colors in Chat ([#1594](https://github.com/Chatterino/chatterino2/pull/1594) on Chatterino)
- Emotes in Chat ([#1378](https://github.com/Chatterino/chatterino2/issues/1378) on Chatterino)
- Waving
- Banning/Blocking
- Liking (+ these mass likes or however they're called)
- Viewers (joining/leaving)
- Heartbeat
- Cards
- (Join-requests)

