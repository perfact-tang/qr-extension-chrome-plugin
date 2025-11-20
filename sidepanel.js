document.addEventListener('DOMContentLoaded', () => {
    
    const tabs = {
        scan: { btn: document.getElementById('tab-scan'), view: document.getElementById('view-scan') },
        generate: { btn: document.getElementById('tab-generate'), view: document.getElementById('view-generate') }
    };

    document.getElementById('tab-scan').addEventListener('click', () => switchTab('scan'));
    document.getElementById('tab-generate').addEventListener('click', () => switchTab('generate'));

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const clearScanBtn = document.getElementById('clear-scan');
    const btnScan = document.getElementById('btn-scan');
    const copyResultBtn = document.getElementById('copy-result');

    dropZone.addEventListener('click', (e) => {
        if(e.target.closest('#clear-scan')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    clearScanBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetScanView();
    });

    btnScan.addEventListener('click', executeScan);
    copyResultBtn.addEventListener('click', copyResult);

    document.addEventListener('paste', (e) => {
        if (tabs.scan.view.classList.contains('hidden')) return;
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
                handleFile(item.getAsFile());
                showToast('クリップボードから画像を読み込みました', 'success'); // 翻訳
                break;
            }
        }
    });

    document.getElementById('paste-url-btn').addEventListener('click', pasteUrl);
    document.getElementById('btn-generate').addEventListener('click', generateQR);
    document.getElementById('btn-download').addEventListener('click', downloadQR);

});

let currentScanImage = null;
let qrcodeObj = null;

function switchTab(tabName) {
    const tabs = {
        scan: { btn: document.getElementById('tab-scan'), view: document.getElementById('view-scan') },
        generate: { btn: document.getElementById('tab-generate'), view: document.getElementById('view-generate') }
    };

    Object.keys(tabs).forEach(key => {
        const t = tabs[key];
        if (key === tabName) {
            t.view.classList.remove('hidden');
            t.view.classList.add('active');
            t.btn.classList.add('active');
        } else {
            t.view.classList.add('hidden');
            t.view.classList.remove('active');
            t.btn.classList.remove('active');
        }
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function handleFile(file) {
    if (!file.type.match('image.*')) {
        showToast('有効な画像ファイル (PNG/JPG) をアップロードしてください', 'error'); // 翻訳
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const scanPreview = document.getElementById('scan-preview');
        scanPreview.src = e.target.result;
        scanPreview.classList.remove('hidden');
        document.getElementById('drop-placeholder').classList.add('hidden');
        document.getElementById('clear-scan').classList.remove('hidden');
        document.getElementById('btn-scan').disabled = false;

        currentScanImage = new Image();
        currentScanImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function resetScanView() {
    document.getElementById('file-input').value = '';
    const scanPreview = document.getElementById('scan-preview');
    scanPreview.src = '';
    scanPreview.classList.add('hidden');
    document.getElementById('drop-placeholder').classList.remove('hidden');
    document.getElementById('clear-scan').classList.add('hidden');
    document.getElementById('btn-scan').disabled = true;
    document.getElementById('scan-result-container').classList.add('hidden');
    currentScanImage = null;
}

function executeScan() {
    if (!currentScanImage) return;
    if (typeof jsQR === 'undefined') {
        showToast('jsQRライブラリがロードされていません。ファイルを確認してください', 'error'); // 翻訳
        return;
    }

    const btnScan = document.getElementById('btn-scan');
    const loader = btnScan.querySelector('.loader');
    const btnText = btnScan.querySelector('.btn-text');
    
    btnScan.disabled = true;
    loader.classList.remove('hidden');
    btnText.textContent = "解析中..."; // 翻訳

    setTimeout(() => {
        try {
            const canvas = document.getElementById('process-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = currentScanImage.width;
            canvas.height = currentScanImage.height;
            ctx.drawImage(currentScanImage, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                showScanResult(code.data);
                showToast('解析成功！', 'success'); // 翻訳
            } else {
                showToast('QRコードを認識できません', 'error'); // 翻訳
            }
        } catch (err) {
            console.error(err);
            showToast('解析エラー', 'error'); // 翻訳
        } finally {
            loader.classList.add('hidden');
            btnText.textContent = "QRコードの内容を解析"; // 翻訳
            btnScan.disabled = false;
        }
    }, 100);
}

function showScanResult(text) {
    const container = document.getElementById('scan-result-container');
    const textarea = document.getElementById('scan-result-text');
    const openLinkBtn = document.getElementById('open-link-btn');

    container.classList.remove('hidden');
    textarea.value = text;

    const urlRegex = /^(http|https):\/\/[^ "]+$/;
    if (urlRegex.test(text)) {
        openLinkBtn.href = text;
        openLinkBtn.classList.remove('hidden');
    } else {
        openLinkBtn.classList.add('hidden');
    }
}

function copyResult() {
    const textarea = document.getElementById('scan-result-text');
    if (!textarea.value) return;
    textarea.select();
    document.execCommand('copy');
    showToast('コピーしました', 'success'); // 翻訳
}

async function pasteUrl() {
    const urlInput = document.getElementById('url-input');
    try {
        // 拡張中读取剪贴板需要权限，这里尝试直接聚焦
        urlInput.focus();
        document.execCommand('paste'); 
        if(!urlInput.value) {
             // 如果 execCommand 失败，提示手动粘贴
            showToast('Ctrl+Vで貼り付けてください', 'info'); // 翻訳
        } else {
            showToast('貼り付けました', 'success'); // 翻訳
        }
    } catch (err) {
        showToast('手動で貼り付けてください', 'info'); // 翻訳
    }
}

function generateQR() {
    const urlInput = document.getElementById('url-input');
    const text = urlInput.value.trim();
    
    if (!text) {
        showToast('内容を入力してください', 'error'); // 翻訳
        urlInput.focus();
        return;
    }
    
    if (typeof QRCode === 'undefined') {
        showToast('QRCodeライブラリがロードされていません', 'error'); // 翻訳
        return;
    }

    const size = parseInt(document.getElementById('qr-size').value);
    const correctLevel = document.getElementById('qr-correct').value;
    const qrcodeOutput = document.getElementById('qrcode-output');
    
    qrcodeOutput.innerHTML = '';
    document.getElementById('generate-result-container').classList.remove('hidden');

    try {
        // 映射纠错等级
        const correctLevelMap = { // 誤り訂正レベルのマップ
            'L': QRCode.CorrectLevel.L,
            'M': QRCode.CorrectLevel.M,
            'Q': QRCode.CorrectLevel.Q,
            'H': QRCode.CorrectLevel.H
        };

        qrcodeObj = new QRCode(qrcodeOutput, {
            text: text,
            width: size,
            height: size,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : correctLevelMap[correctLevel]
        });
        
        showToast('生成成功', 'success'); // 翻訳
    } catch (e) {
        console.error(e);
        showToast('生成に失敗しました。内容が長すぎる可能性があります', 'error'); // 翻訳
    }
}

function downloadQR() {
    const qrcodeOutput = document.getElementById('qrcode-output');
    const img = qrcodeOutput.querySelector('img');
    
    if (img && img.src) {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = `qrcode_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        // 尝试查找 canvas (fallback)
        const canvas = qrcodeOutput.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.href = canvas.toDataURL("image/png");
            link.download = `qrcode_${Date.now()}.png`;
            link.click();
        } else {
            showToast('ダウンロード可能な画像がありません', 'error'); // 翻訳
        }
    }
}