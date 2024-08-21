const inTextarea = document.getElementById('input') as HTMLTextAreaElement
const varInput = document.getElementById('var') as HTMLInputElement
const outTextArea = document.getElementById('output') as HTMLTextAreaElement
const processBtn = document.getElementById('process') as HTMLButtonElement
const downloadBtn = document.getElementById('download') as HTMLButtonElement

inTextarea.addEventListener('input', (e: Event & { target: HTMLTextAreaElement }) => {
	processBtn.disabled = !e.target.value
})

interface IData {
	prey: number
	predator: number
	prey_predator_ratio: number
	time_take: number
	settings: {
		mode: string
		ENTITY_SIZE: number
		ENTITY_RECOGNITION_RANGE: number
		ENTITY_ATTACK_MAX: number
		ENTITY_ATTACK_COOLDOWN: number
		PREY_PERCENTAGE: number
		ENTITES_COUNT: number
		ENTITY_SPEED: number
		SEPARATION_FACTOR: number
		ALIGNMENT_FACTOR: number
		COHESION_FACTOR: number
		SIMULATION_ACCELERATION: number
	}
	winner: types
}

processBtn.addEventListener('click', () => {
	// console.log(inTextarea.value)
	try {
		const data: IData[] = JSON.parse(inTextarea.value)
		outTextArea.value = [
			`${varInput.value}, winner, time, prey_predator_ratio`,
			...data.map((d) => `${d.settings[varInput.value]}, ${d.winner}, ${d.time_take}, ${d.prey_predator_ratio}`),
		].join(`\n`)
	} catch (e) {
		alert(`${e}\n90% 확률로 JSON에 에러가 있다는 내용.`)
	}
})

downloadBtn.addEventListener('click', () => {
	downloadDataUrl('data:text/plain;charset=utf-8,' + encodeURIComponent(outTextArea.value), `${Date.now()}.csv`)
})

function downloadDataUrl(dataUrl: string, filename: string) {
	const a = document?.createElement('a')
	a.setAttribute('download', filename)
	a.setAttribute('href', dataUrl)
	a.click()
	console.log('adasd')
}
