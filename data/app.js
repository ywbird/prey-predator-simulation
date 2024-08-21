const inTextarea = document.getElementById('input');
const varInput = document.getElementById('var');
const outTextArea = document.getElementById('output');
const processBtn = document.getElementById('process');
const downloadBtn = document.getElementById('download');
inTextarea.addEventListener('input', (e) => {
    processBtn.disabled = !e.target.value;
});
processBtn.addEventListener('click', () => {
    // console.log(inTextarea.value)
    try {
        const data = JSON.parse(inTextarea.value);
        outTextArea.value = [
            `${varInput.value}, winner, time, prey_predator_ratio`,
            ...data.map((d) => `${d.settings[varInput.value]}, ${d.winner === 'prey' ? 1 : 2}, ${d.time_take}, ${d.prey_predator_ratio}`),
        ].join(`\n`);
    }
    catch (e) {
        alert(`${e}\n90% 확률로 JSON에 에러가 있다는 내용.`);
    }
});
downloadBtn.addEventListener('click', () => {
    downloadDataUrl('data:text/plain;charset=utf-8,' + encodeURIComponent(outTextArea.value), `${Date.now()}.csv`);
});
function downloadDataUrl(dataUrl, filename) {
    const a = document === null || document === void 0 ? void 0 : document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', dataUrl);
    a.click();
    console.log('adasd');
}
