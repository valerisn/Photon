# Photon

Photon is a small FiveM screenshot resource built from `screenshot-basic` by the CFX Collective.

All credit for the original screenshot implementation and the underlying work used to make `screenshot-basic` goes to the CFX Collective and its contributors.

This fork was only adjusted to meet my needs for a few scripts I plan to make before leaving the FiveM development space.

## What It Does

Photon lets scripts request screenshots from a FiveM client. It can return the screenshot as a base64 data URI, upload it directly to a remote HTTP endpoint, or let the server request a screenshot from a player and receive the image back.

The resource is intended to be used through exports. It does not add standalone commands.

## Installation

Place Photon in your resources folder and ensure it from your `server.cfg`:

```cfg
ensure Photon
```

If you are building from source, install dependencies and build the resource:

```bash
npm install
npm run build
```

## Client Exports

### requestScreenshot

Captures a screenshot on the local client and returns it as a base64 data URI.

```lua
exports['Photon']:requestScreenshot(function(data)
    print(data)
end)
```

With options:

```lua
exports['Photon']:requestScreenshot({
    encoding = 'jpg',
    quality = 0.92
}, function(data)
    print(data)
end)
```

Options:

| Option | Type | Description |
| --- | --- | --- |
| `encoding` | `'jpg'`, `'png'`, or `'webp'` | Image format. Defaults to `jpg`. |
| `quality` | `number` | Lossy image quality from `0.0` to `1.0`. Defaults to `0.92`. |

Callback:

| Value | Description |
| --- | --- |
| `data` | Base64 data URI for the screenshot. |

Do not send large data URI screenshots through server events unless you know exactly what you are doing.

### requestScreenshotUpload

Captures a screenshot on the local client and uploads it to an HTTP endpoint as `multipart/form-data`.

```lua
exports['Photon']:requestScreenshotUpload('https://example.com/upload', 'file', function(response)
    print(response)
end)
```

With options:

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

Arguments:

| Argument | Type | Description |
| --- | --- | --- |
| `url` | `string` | Remote upload URL. |
| `field` | `string` | Multipart form field name for the uploaded file. |
| `options` | `table` | Optional screenshot/upload options. |
| `cb` | `function` | Callback receiving the remote response body. |

Options:

| Option | Type | Description |
| --- | --- | --- |
| `encoding` | `'jpg'`, `'png'`, or `'webp'` | Image format. Defaults to `jpg`. |
| `quality` | `number` | Lossy image quality from `0.0` to `1.0`. Defaults to `0.92`. |
| `headers` | `table` | Optional HTTP headers for the upload request. |

## Server Export

### requestClientScreenshot

Requests a screenshot from a specific player. The player uploads the result back to Photon's built-in server HTTP handler.

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

To save the screenshot to a local file on the server:

```lua
exports['Photon']:requestClientScreenshot(source, {
    fileName = 'cache/screenshot.jpg',
    encoding = 'jpg',
    quality = 0.92
}, function(err, fileName)
    if err then
        print('Screenshot failed:', err)
        return
    end

    print('Saved screenshot:', fileName)
end)
```

Arguments:

| Argument | Type | Description |
| --- | --- | --- |
| `player` | `string` or `number` | Target player server ID. |
| `options` | `table` | Screenshot options. |
| `cb` | `function` | Callback receiving `err` and `data`. |

Options:

| Option | Type | Description |
| --- | --- | --- |
| `fileName` | `string` | Optional server-side file path. If omitted, callback receives a data URI. |
| `encoding` | `'jpg'`, `'png'`, or `'webp'` | Image format. Defaults to `jpg`. |
| `quality` | `number` | Lossy image quality from `0.0` to `1.0`. Defaults to `0.92`. |

Callback:

| Value | Description |
| --- | --- |
| `err` | `false` on success, or an error string. |
| `data` | Saved file path when `fileName` is used, otherwise a base64 data URI. |

## Notes

Photon keeps the same general idea as `screenshot-basic`: use NUI/WebGL to read the game render target, encode it in the browser context, then send it where the caller requested.

Server-requested screenshots use a temporary upload token and time out if the client never uploads the image.
