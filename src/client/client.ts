const exp = (<any>global).exports;

RegisterNuiCallbackType('screenshot_created');

class ResultData {
    cb!: (data: string) => void;

    timeout!: NodeJS.Timeout;
}

const results: {[id: string]: ResultData} = {};
let correlationId = 0;
const resultTimeout = 60000;

function registerCorrelation(cb: (result: string) => void) {
    const id = correlationId.toString();

    const timeout = setTimeout(() => {
        if (!results[id]) {
            return;
        }

        results[id].cb(JSON.stringify({ error: 'request timed out' }));
        delete results[id];
    }, resultTimeout);

    results[id] = { cb, timeout };

    correlationId++;

    return id;
}

on('__cfx_nui:screenshot_created', (body: any, cb: (arg: any) => void) => {
    cb(true);

    if (body.id !== undefined && results[body.id]) {
        clearTimeout(results[body.id].timeout);
        results[body.id].cb(body.data);
        delete results[body.id];
    }
});

exp('requestScreenshot', (options: any, cb: (result: string) => void) => {
    const realOptions = (cb !== undefined) ? { ...(options || {}) } : {
        encoding: 'jpg'
    };

    const realCb = (cb !== undefined) ? cb : options;

    realOptions.encoding = realOptions.encoding || 'jpg';
    realOptions.resultURL = null;
    realOptions.targetField = null;
    realOptions.targetURL = `http://${GetCurrentResourceName()}/screenshot_created`;
    
    realOptions.correlation = registerCorrelation(realCb);

    SendNuiMessage(JSON.stringify({
        request: realOptions
    }));
});

exp('requestScreenshotUpload', (url: string, field: string, options: any, cb: (result: string) => void) => {
    const realOptions = (cb !== undefined) ? { ...(options || {}) } : {
        headers: {},
        encoding: 'jpg'
    };

    const realCb = (cb !== undefined) ? cb : options;

    realOptions.headers = realOptions.headers || {};
    realOptions.encoding = realOptions.encoding || 'jpg';
    realOptions.targetURL = url;
    realOptions.targetField = field;
    realOptions.resultURL = `http://${GetCurrentResourceName()}/screenshot_created`;
    
    realOptions.correlation = registerCorrelation(realCb);

    SendNuiMessage(JSON.stringify({
        request: realOptions
    }));
});

RegisterNuiCallbackType('screenshot_command');
RegisterNuiCallbackType('screenshot_command_close');

function takeSelfScreenshot(options: any): Promise<string> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject('screenshot timed out');
        }, 30000);

        exp('requestScreenshot', options, (data: string) => {
            clearTimeout(timeout);
            resolve(data);
        });
    });
}

on('__cfx_nui:screenshot_command', (body: any, cb: (arg: any) => void) => {
    cb(true);

    const handler = async () => {
        const options: any = {
            encoding: body.encoding || 'jpg',
            quality: body.quality || 0.92
        };

        if (body.width) { options.width = body.width; }
        if (body.height) { options.height = body.height; }
        if (body.overlay) { options.overlay = body.overlay; }

        if (!body.player) {
            try {
                const data = await takeSelfScreenshot(options);
                SendNuiMessage(JSON.stringify({
                    type: 'screenshotCommandResult',
                    result: { ok: true, data }
                }));
            } catch (err) {
                SendNuiMessage(JSON.stringify({
                    type: 'screenshotCommandResult',
                    result: { ok: false, error: String(err) }
                }));
            }
        } else {
            options.target = body.player;
            options.sendToDiscord = body.sendToDiscord === true;
            emitNet('photon:commandScreenshot', options);
        }
    };

    handler();
});

on('__cfx_nui:screenshot_command_close', (body: any, cb: (arg: any) => void) => {
    cb(true);
    SetNuiFocus(false, false);
});

onNet('photon:openCommandUI', () => {
    SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
        type: 'showScreenshotUI'
    }));
});

onNet('photon:commandScreenshotResult', (result: any) => {
    SendNuiMessage(JSON.stringify({
        type: 'screenshotCommandResult',
        result
    }));
});

onNet('photon:requestScreenshot', (options: any, url: string) => {
    const requestOptions = { ...(options || {}) };
    requestOptions.encoding = requestOptions.encoding || 'jpg';

    requestOptions.targetURL = `http://${GetCurrentServerEndpoint()}${url}`;
    requestOptions.targetField = 'file';
    requestOptions.resultURL = null;

    requestOptions.correlation = registerCorrelation(() => {});

    SendNuiMessage(JSON.stringify({
        request: requestOptions
    }));
});
