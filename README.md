# Photon

Photon is a small FiveM screenshot resource built from `screenshot-basic` by the CFX Collective.

All credit for the original screenshot implementation and the underlying work used to make `screenshot-basic` goes to the CFX Collective and its contributors.

This fork was only adjusted to meet my needs for a few scripts I plan to make before leaving the FiveM development space.

## What It Does

Photon lets scripts request screenshots from a FiveM client. It can return a base64 data URI, upload directly to an HTTP endpoint, save a server-requested screenshot to disk, or send a player screenshot to Discord.

Photon is used through exports. It does not add standalone commands.

## Installation

Place Photon in your resources folder and ensure it from `server.cfg`:

```cfg
ensure Photon
```

If building from source:

```bash
npm install
npm run build
```

## Configuration

Photon reads `photon.config.json` from the resource root.

```json
{
    "defaultEncoding": "jpg",
    "defaultQuality": 0.92,
    "uploadTimeoutMs": 60000,
    "maxConcurrentRequestsPerPlayer": 1,
    "saveDirectory": "cache/photon",
    "allowedWebhookHosts": ["discord.com", "discordapp.com"],
    "debug": false
}
```

| Option | Description |
| --- | --- |
| `defaultEncoding` | Default image format for server-requested screenshots. |
| `defaultQuality` | Default lossy encoder quality from `0.0` to `1.0`. |
| `uploadTimeoutMs` | How long server-requested screenshots can wait before failing. |
| `maxConcurrentRequestsPerPlayer` | Per-player active screenshot request limit. |
| `saveDirectory` | Folder used when `save = true` generates a filename. |
| `allowedWebhookHosts` | Host allowlist for Discord webhook uploads. |
| `debug` | Enables Photon server debug logging. |

## Client Exports

### requestScreenshot

Captures a screenshot on the local client and returns it as a base64 data URI.

```lua
exports['Photon']:requestScreenshot(function(data)
    print(data)
end)
```

```lua
exports['Photon']:requestScreenshot({
    encoding = 'jpg',
    quality = 0.92
}, function(data)
    print(data)
end)
```

| Option | Description |
| --- | --- |
| `encoding` | `jpg`, `png`, or `webp`. Defaults to `jpg`. |
| `quality` | Lossy encoder quality from `0.0` to `1.0`. Defaults to `0.92`. |

Do not send large data URI screenshots through server events unless you know exactly what you are doing.

### requestScreenshotUpload

Captures a screenshot on the local client and uploads it to an HTTP endpoint as `multipart/form-data`.

```lua
exports['Photon']:requestScreenshotUpload('https://example.com/upload', 'file', {
    encoding = 'jpg',
    quality = 0.9,
    headers = {
        ['Authorization'] = 'Bearer token'
    }
}, function(response)
    print(response)
end)
```

| Argument | Description |
| --- | --- |
| `url` | Remote upload URL. |
| `field` | Multipart form field name for the uploaded file. |
| `options` | Optional screenshot/upload options. |
| `cb` | Callback receiving the remote response body. |

| Option | Description |
| --- | --- |
| `encoding` | `jpg`, `png`, or `webp`. Defaults to `jpg`. |
| `quality` | Lossy encoder quality from `0.0` to `1.0`. Defaults to `0.92`. |
| `headers` | Optional HTTP headers for the upload request. |

## Server Exports

### requestClientScreenshot

Requests a screenshot from a specific player. This keeps the original `err, data` callback style.

```lua
exports['Photon']:requestClientScreenshot(source, {
    encoding = 'jpg',
    quality = 0.92
}, function(err, data)
    if err then
        print('Screenshot failed:', err)
        return
    end

    print(data)
end)
```

To save to a specific server path:

```lua
exports['Photon']:requestClientScreenshot(source, {
    fileName = 'cache/screenshots/player.jpg'
}, function(err, fileName)
    print(err, fileName)
end)
```

To auto-generate a file path in `saveDirectory`:

```lua
exports['Photon']:requestClientScreenshot(source, {
    save = true,
    encoding = 'jpg'
}, function(err, fileName)
    print(err, fileName)
end)
```

Photon creates missing save directories automatically.

### requestClientScreenshotResult

Requests a screenshot and returns a single result table.

```lua
exports['Photon']:requestClientScreenshotResult(source, {
    encoding = 'jpg',
    metadata = {
        reason = 'staff-check',
        staff = GetPlayerName(source)
    }
}, function(result)
    if not result.ok then
        print('Screenshot failed:', result.error)
        return
    end

    print(result.data)
    print(json.encode(result.metadata))
end)
```

Result table:

| Field | Description |
| --- | --- |
| `ok` | `true` on success, `false` on failure. |
| `error` | Error string when `ok` is `false`. |
| `data` | Data URI or saved file path when successful. |
| `metadata` | Caller-provided metadata copied back into the result. |

### requestClientScreenshotToDiscord

Requests a screenshot from a player and uploads it to a Discord webhook as an attached file.

```lua
exports['Photon']:requestClientScreenshotToDiscord(source, 'https://discord.com/api/webhooks/...', {
    content = 'Player screenshot',
    embedTitle = 'Photon Screenshot',
    embedDescription = 'Requested by staff',
    encoding = 'jpg',
    quality = 0.92,
    metadata = {
        reason = 'staff-check'
    }
}, function(result)
    if not result.ok then
        print('Discord upload failed:', result.error)
        return
    end

    print('Discord response:', result.data)
end)
```

| Option | Description |
| --- | --- |
| `content` | Message content sent with the webhook. |
| `username` | Optional webhook username override. |
| `avatarUrl` | Optional webhook avatar URL override. |
| `embedTitle` | Optional embed title. |
| `embedDescription` | Optional embed description. |
| `encoding` | `jpg`, `png`, or `webp`. Defaults to config. |
| `quality` | Lossy encoder quality from `0.0` to `1.0`. Defaults to config. |
| `metadata` | Data returned back in the result callback. |

Webhook uploads are restricted by `allowedWebhookHosts` in `photon.config.json`.

## Server Options

| Option | Description |
| --- | --- |
| `fileName` | Save to this server-side path instead of returning a data URI. |
| `save` | When `true`, save using an auto-generated path in `saveDirectory`. |
| `encoding` | `jpg`, `png`, or `webp`. Defaults to config. |
| `quality` | Lossy encoder quality from `0.0` to `1.0`. Defaults to config. |
| `metadata` | Server-side metadata copied into result-style callbacks. |

## Notes

Photon keeps the same general idea as `screenshot-basic`: use NUI/WebGL to read the game render target, encode it in the browser context, then send it where the caller requested.

Server-requested screenshots use temporary upload tokens, time out when clients do not upload, and are limited per player by config.
