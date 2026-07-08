import {
    OrthographicCamera,
    Scene,
    WebGLRenderTarget,
    LinearFilter,
    NearestFilter,
    RGBAFormat,
    UnsignedByteType,
    CfxTexture,
    ShaderMaterial,
    PlaneBufferGeometry,
    Mesh,
    WebGLRenderer
} from '@citizenfx/three';

declare function GetParentResourceName(): string;

class ScreenshotRequest {
    encoding: 'jpg' | 'png' | 'webp';
    quality: number;
    headers: any;

    correlation: string;

    resultURL: string;

    targetURL: string;
    targetField: string;

    width: number;
    height: number;

    overlay: {
        text: string;
        fontSize: number;
        color: string;
        position: string;
        background: string;
    };

    transform: {
        resize: {
            width: number;
            height: number;
        };
        watermark: {
            text: string;
            fontSize: number;
            color: string;
            position: string;
            background: string;
        };
    };
}

function postResult(request: ScreenshotRequest, data: string) {
    if (!request.resultURL) {
        return;
    }

    fetch(request.resultURL, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({
            data,
            id: request.correlation
        })
    });
}

// from https://stackoverflow.com/a/12300351
function dataURItoBlob(dataURI: string) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
  
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
  
    const blob = new Blob([ab], {type: mimeString});
    return blob;
}

class ScreenshotUI {
    renderer: any;
    rtTexture: any;
    sceneRTT: any;
    cameraRTT: any;
    material: any;
    request: ScreenshotRequest;

    initialize() {
        window.addEventListener('message', event => {
            this.request = event.data.request;
        });

        window.addEventListener('resize', event => {
            this.resize();
        });

        const cameraRTT: any = new OrthographicCamera( window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000 );
        cameraRTT.position.z = 100;

        const sceneRTT: any = new Scene();

        const rtTexture = new WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: LinearFilter, magFilter: NearestFilter, format: RGBAFormat, type: UnsignedByteType } );
        const gameTexture: any = new CfxTexture( );
        gameTexture.needsUpdate = true;

        const material = new ShaderMaterial( {

            uniforms: { "tDiffuse": { value: gameTexture } },
            vertexShader: `
			varying vec2 vUv;

			void main() {
				vUv = vec2(uv.x, 1.0-uv.y); // fuck gl uv coords
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}
`,
            fragmentShader: `
			varying vec2 vUv;
			uniform sampler2D tDiffuse;

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );
			}
`

        } );

        this.material = material;

        const plane = new PlaneBufferGeometry( window.innerWidth, window.innerHeight );
        const quad: any = new Mesh( plane, material );
        quad.position.z = -100;
        sceneRTT.add( quad );

        const renderer = new WebGLRenderer();
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.autoClear = false;

        document.getElementById('app').appendChild(renderer.domElement);
        document.getElementById('app').style.display = 'none';

        this.renderer = renderer;
        this.rtTexture = rtTexture;
        this.sceneRTT = sceneRTT;
        this.cameraRTT = cameraRTT;

        this.animate = this.animate.bind(this);

        requestAnimationFrame(this.animate);
    }

    resize() {
        const cameraRTT: any = new OrthographicCamera( window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000 );
        cameraRTT.position.z = 100;

        this.cameraRTT = cameraRTT;

        const sceneRTT: any = new Scene();

        const plane = new PlaneBufferGeometry( window.innerWidth, window.innerHeight );
        const quad: any = new Mesh( plane, this.material );
        quad.position.z = -100;
        sceneRTT.add( quad );

        this.sceneRTT = sceneRTT;

        this.rtTexture = new WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: LinearFilter, magFilter: NearestFilter, format: RGBAFormat, type: UnsignedByteType } );

        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

    animate() {
        requestAnimationFrame(this.animate);

        this.renderer.clear();
        this.renderer.render(this.sceneRTT, this.cameraRTT, this.rtTexture, true);

        if (this.request) {
            const request = this.request;
            this.request = null;

            this.handleRequest(request);
        }
    }

    drawOverlay(ctx: CanvasRenderingContext2D, overlay: any, width: number, height: number) {
        const pos = overlay.position || 'bottom-left';
        const fontSize = overlay.fontSize || 24;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textBaseline = 'alphabetic';

        const lines = overlay.text.split('\n');
        const lineHeight = fontSize * 1.4;
        const padding = 16;
        let boxHeight = lines.length * lineHeight + padding * 2;
        let boxWidth = 0;
        for (const line of lines) {
            const m = ctx.measureText(line);
            boxWidth = Math.max(boxWidth, m.width + padding * 2);
        }

        let x: number, y: number;
        switch (pos) {
            case 'top-left':
                x = 0;
                y = 0;
                break;
            case 'top-right':
                x = width - boxWidth;
                y = 0;
                break;
            case 'bottom-left':
                x = 0;
                y = height - boxHeight;
                break;
            case 'bottom-right':
                x = width - boxWidth;
                y = height - boxHeight;
                break;
            default:
                x = Math.round((width - boxWidth) / 2);
                y = Math.round((height - boxHeight) / 2);
        }

        if (overlay.background) {
            ctx.fillStyle = overlay.background;
            ctx.fillRect(x, y, boxWidth, boxHeight);
        }

        ctx.fillStyle = overlay.color || '#ffffff';
        ctx.textBaseline = 'top';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x + padding, y + padding + i * lineHeight);
        }
    }

    handleRequest(request: ScreenshotRequest) {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // read the screenshot
        const read = new Uint8Array(w * h * 4);
        this.renderer.readRenderTargetPixels(this.rtTexture, 0, 0, w, h, read);

        // process transform pipeline
        if (request.transform) {
            if (request.transform.resize) {
                if (!request.width) {
                    request.width = request.transform.resize.width;
                }
                if (!request.height) {
                    request.height = request.transform.resize.height;
                }
            }
            if (request.transform.watermark && !request.overlay) {
                request.overlay = request.transform.watermark;
            }
        }

        // target output dimensions
        const outW = request.width || w;
        const outH = request.height || h;

        // create a temporary canvas to compress the image
        const canvas = document.createElement('canvas');
        canvas.style.display = 'inline';
        canvas.width = outW;
        canvas.height = outH;

        // draw the image on the canvas, scaling if resolution differs
        const d = new Uint8ClampedArray(read.buffer);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(new ImageData(d, w, h), 0, 0);

        const cxt = canvas.getContext('2d');
        cxt.drawImage(tempCanvas, 0, 0, w, h, 0, 0, outW, outH);

        if (request.overlay) {
            this.drawOverlay(cxt, request.overlay, outW, outH);
        }

        // encode the image
        let type = 'image/png';

        switch (request.encoding) {
            case 'jpg':
                type = 'image/jpeg';
                break;
            case 'png':
                type = 'image/png';
                break;
            case 'webp':
                type = 'image/webp';
                break;
        }

        if (!request.quality) {
            request.quality = 0.92;
        }

        // actual encoding
        const imageURL = canvas.toDataURL(type, request.quality);

        const getFormData = () => {
            const formData = new FormData();
            formData.append(request.targetField, dataURItoBlob(imageURL), `screenshot.${request.encoding}`);

            return formData;
        };

        // upload the image somewhere
        fetch(request.targetURL, {
            method: 'POST',
            mode: 'cors',
            headers: request.headers,
            body: (request.targetField) ? getFormData() : JSON.stringify({
                data: imageURL,
                id: request.correlation
            })
        })
        .then(response => response.text())
        .then(text => {
            postResult(request, text);
        })
        .catch(err => {
            postResult(request, JSON.stringify({
                error: err && err.message ? err.message : 'upload failed'
            }));
        });
    }
}

const ui = new ScreenshotUI();
ui.initialize();

// Command UI
const resourceName = GetParentResourceName ? GetParentResourceName() : 'Photon';

function showCommandUI() {
    const el = document.getElementById('command-ui');
    if (el) {
        el.classList.add('open');
    }

    const resultEl = document.getElementById('cmd-result');
    if (resultEl) {
        resultEl.style.display = 'none';
    }

    const statusEl = document.getElementById('cmd-status');
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'command-status';
    }
}

function hideCommandUI() {
    const el = document.getElementById('command-ui');
    if (el) {
        el.classList.remove('open');
    }

    fetch(`https://cfx-nui-${resourceName}/screenshot_command_close`, {
        method: 'POST',
        mode: 'cors',
        body: '{}'
    });
}

function submitCommand() {
    const playerInput = document.getElementById('cmd-player') as HTMLInputElement;
    const encodingSelect = document.getElementById('cmd-encoding') as HTMLSelectElement;
    const qualityInput = document.getElementById('cmd-quality') as HTMLInputElement;
    const overlayInput = document.getElementById('cmd-overlay') as HTMLInputElement;
    const positionSelect = document.getElementById('cmd-position') as HTMLSelectElement;
    const widthInput = document.getElementById('cmd-width') as HTMLInputElement;
    const heightInput = document.getElementById('cmd-height') as HTMLInputElement;
    const discordCheck = document.getElementById('cmd-discord') as HTMLInputElement;

    const data: any = {
        player: playerInput.value.trim()
    };

    if (data.player.length === 0) {
        data.player = null;
    }

    data.encoding = encodingSelect.value;
    data.quality = parseFloat(qualityInput.value) || 0.92;

    if (overlayInput.value.trim()) {
        data.overlay = {
            text: overlayInput.value.trim(),
            position: positionSelect.value,
            color: '#ffffff',
            fontSize: 24,
            background: 'rgba(0,0,0,0.5)'
        };
    }

    if (widthInput.value) {
        data.width = parseInt(widthInput.value, 10);
    }

    if (heightInput.value) {
        data.height = parseInt(heightInput.value, 10);
    }

    data.sendToDiscord = discordCheck.checked;

    const statusEl = document.getElementById('cmd-status');
    if (statusEl) {
        statusEl.textContent = 'Capturing...';
        statusEl.className = 'command-status';
    }

    const captureBtn = document.getElementById('cmd-capture') as HTMLButtonElement;
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.textContent = 'Capturing...';
    }

    fetch(`https://cfx-nui-${resourceName}/screenshot_command`, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(data)
    })
    .then(() => {});
}

function displayCommandResult(result: any) {
    const resultEl = document.getElementById('cmd-result');
    const statusEl = document.getElementById('cmd-status');
    const captureBtn = document.getElementById('cmd-capture') as HTMLButtonElement;

    if (captureBtn) {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Capture';
    }

    if (!resultEl || !statusEl) {
        return;
    }

    if (result.ok === false) {
        statusEl.textContent = 'Error: ' + (result.error || 'unknown error');
        statusEl.className = 'command-status error';
        resultEl.style.display = 'none';
        return;
    }

    statusEl.textContent = 'Screenshot captured';
    statusEl.className = 'command-status success';

    let html = '';

    if (result.data && result.data.startsWith('data:')) {
        html += '<img src="' + result.data + '" alt="screenshot" />';
    } else if (result.data) {
        html += '<div>Result: ' + result.data + '</div>';
    }

    resultEl.innerHTML = html;
    resultEl.style.display = 'block';
}

// Wire up buttons
const captureBtn = document.getElementById('cmd-capture');
if (captureBtn) {
    captureBtn.addEventListener('click', submitCommand);
}

const closeBtn = document.getElementById('cmd-close');
if (closeBtn) {
    closeBtn.addEventListener('click', hideCommandUI);
}

// Listen for enter key on player input
const playerInput = document.getElementById('cmd-player');
if (playerInput) {
    playerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submitCommand();
        }
    });
}

// Listen for messages to show the command UI
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'showScreenshotUI') {
        showCommandUI();
    }

    if (event.data && event.data.type === 'screenshotCommandResult') {
        displayCommandResult(event.data.result);
    }
});
