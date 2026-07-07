import { setHttpCallback } from '@citizenfx/http-wrapper';

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import Koa from 'koa';
import Router from '@koa/router';
import { koaBody } from 'koa-body';
import mv from 'mv';
import { File } from 'formidable';

const app = new Koa();
const router = new Router();

type PhotonConfig = {
    defaultEncoding: 'jpg' | 'png' | 'webp';
    defaultQuality: number;
    uploadTimeoutMs: number;
    maxConcurrentRequestsPerPlayer: number;
    saveDirectory: string;
    allowedWebhookHosts: string[];
    debug: boolean;
};

type PhotonResult = {
    ok: boolean;
    error?: string;
    data?: string;
};

type ScreenshotCallback = (err: string | boolean, data: string) => void;

const defaultConfig: PhotonConfig = {
    defaultEncoding: 'jpg',
    defaultQuality: 0.92,
    uploadTimeoutMs: 60000,
    maxConcurrentRequestsPerPlayer: 1,
    saveDirectory: 'cache/photon',
    allowedWebhookHosts: ['discord.com', 'discordapp.com'],
    debug: false
};

function loadConfig(): PhotonConfig {
    const rawConfig = LoadResourceFile(GetCurrentResourceName(), 'photon.config.json');

    if (!rawConfig) {
        return defaultConfig;
    }

    try {
        return {
            ...defaultConfig,
            ...JSON.parse(rawConfig)
        };
    } catch (err) {
        console.warn(`[Photon] Failed to parse photon.config.json: ${err.message}`);
        return defaultConfig;
    }
}

const config = loadConfig();

function debugLog(message: string) {
    if (config.debug) {
        console.log(`[Photon] ${message}`);
    }
}

class UploadData {
    fileName!: string;

    cb!: ScreenshotCallback;

    timeout!: NodeJS.Timeout;
}

const uploads: { [token: string]: UploadData } = {};

router.post('/upload/:token', async (ctx) => {
    const tkn: string = ctx.params['token'];

    ctx.response.append('Access-Control-Allow-Origin', '*');
    ctx.response.append('Access-Control-Allow-Methods', 'GET, POST');

    if (uploads[tkn] !== undefined) {
        const upload = uploads[tkn];
        delete uploads[tkn];
        clearTimeout(upload.timeout);

        const finish = (err: string | null, data: string | null) => {
            setImmediate(() => {
                upload.cb(err || false, data);
            });
        }

        const f = ctx.request.files?.['file'] as File;

        if (!f) {
            finish('no file uploaded', null);
            ctx.status = 400;
            ctx.body = { success: false };

            return;
        }

        if (upload.fileName) {
            mv(f.filepath, upload.fileName, (err) => {
                if (err) {
                    finish(err.message, null);
                    return;
                }

                finish(null, upload.fileName);
            });
        } else {
            fs.readFile(f.filepath, (err, data) => {
                if (err) {
                    finish(err.message, null);
                    return;
                }

                fs.unlink(f.filepath, (err) => {
                    finish(null, `data:${f.mimetype};base64,${data.toString('base64')}`);
                });
            });
        }

        ctx.body = { success: true };

        return;
    }

    ctx.body = { success: false };
});

app.use(koaBody({
        patchKoa: true,
        multipart: true,
    }))
   .use(router.routes())
   .use(router.allowedMethods());

setHttpCallback(app.callback());

function requestClientScreenshot(player: string | number, options: any, cb: ScreenshotCallback) {
    const tkn = randomUUID();
    const requestOptions = { ...(options || {}) };

    const fileName = requestOptions.fileName;
    delete requestOptions['fileName']; // so the client won't get to know this

    const timeout = setTimeout(() => {
        if (uploads[tkn] === undefined) {
            return;
        }

        const upload = uploads[tkn];
        delete uploads[tkn];
        upload.cb('request timed out', null);
    }, config.uploadTimeoutMs);

    requestOptions.encoding = requestOptions.encoding || config.defaultEncoding;
    requestOptions.quality = requestOptions.quality || config.defaultQuality;

    uploads[tkn] = {
        fileName,
        cb,
        timeout
    };

    debugLog(`requesting screenshot from player ${player}`);
    emitNet('photon:requestScreenshot', player, requestOptions, `/${GetCurrentResourceName()}/upload/${tkn}`);
}

function toResult(err: string | boolean, data: string): PhotonResult {
    if (err) {
        return {
            ok: false,
            error: String(err)
        };
    }

    return {
        ok: true,
        data
    };
}

// Cfx stuff
const exp = (<any>global).exports;

exp('requestClientScreenshot', (player: string | number, options: any, cb: ScreenshotCallback) => {
    requestClientScreenshot(player, options, cb);
});

exp('requestClientScreenshotResult', (player: string | number, options: any, cb: (result: PhotonResult) => void) => {
    requestClientScreenshot(player, options, (err, data) => {
        cb(toResult(err, data));
    });
});
