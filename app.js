const container = document.getElementById('canvas-container');
const debug = document.getElementById('debug');
const resetBtn = document.getElementById('reset');
const pauseBtn = document.getElementById('pause');
const exportBtn = document.getElementById('export');
const importBtn = document.getElementById('import');
const resetLogBtn = document.getElementById('reset-log');
const settingsTextarea = document.getElementById('settings');
const logTextarea = document.getElementById('log');
const options = document.getElementById('options');
const modeSelection = document.getElementById('mode');
const iterInput = document.getElementById('iter');
const iterMin = document.getElementById('iter-min');
const iterMax = document.getElementById('iter-max');
const iterStep = document.getElementById('iter-step');
const iterLoop = document.getElementById('iter-loop');
const iterStartBtn = document.getElementById('iter-start');
const pi = Math.PI;
var types;
(function (types) {
    types["prey"] = "prey";
    types["predator"] = "predator";
})(types || (types = {}));
class Renderer {
    constructor(width, height, container) {
        this.width = width;
        this.height = height;
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.isRun = false;
        this.pause = false;
        this.canvas.width = width;
        this.canvas.height = height;
        this.showCanvas = document.createElement('canvas');
        this.showCanvas.width = width;
        this.showCanvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.transform(1, 0, 0, -1, 0, height);
        this.ctx.translate(this.width / 2, this.height / 2);
        this.container.appendChild(this.showCanvas);
        this.lastTime = Date.now();
        this.delta = 0;
    }
    run(draw, update) {
        this.draw = draw;
        this.update = update;
        this.isRun = true;
        window.requestAnimationFrame(this.step.bind(this));
    }
    step() {
        // if ((Date.now() - this.lastTime) < 50) return
        if (!this.isRun || this.pause)
            return;
        if (this.isRun && !this.pause) {
            this.delta = (Date.now() - this.lastTime) / 1000;
            this.update(this.delta);
            this.lastTime = Date.now();
        }
        this.clear(this.ctx);
        this.draw(this.ctx, this.delta, { width: this.width, height: this.height });
        this.showCanvas.getContext('2d').drawImage(this.canvas, 0, 0);
        this.isRun && !this.pause && window.requestAnimationFrame(this.step.bind(this));
    }
    clear(ctx) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(200, 200, 200, 255)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.stroke();
        ctx.closePath();
    }
    registerListener(events) {
        events.forEach(([type, listener]) => {
            this.showCanvas.addEventListener(type, listener);
        });
    }
}
class Entity {
    constructor(x, y, direction, demage, type) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.attack = demage;
        this.attackCooldown = opts.ENTITY_ATTACK_COOLDOWN;
        this.type = type;
        this.highlight = false;
        this.touch = '';
        this.alive = true;
        this.uuid = crypto.randomUUID();
        this.props = {};
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        switch (this.type) {
            case types.prey: {
                ctx.strokeStyle = 'blue';
                break;
            }
            case types.predator: {
                ctx.strokeStyle = 'red';
                break;
            }
            default:
                ctx.strokeStyle = 'black';
        }
        ctx.fillStyle = `${ctx.strokeStyle}${Math.round((this.attack / 100) * 255)
            .toString(16)
            .padStart(2, '0')}`;
        // ctx.fillStyle = `#00000088`
        ctx.arc(this.x, this.y, opts.ENTITY_SIZE * 0.9, 0, 2 * pi);
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(this.x, this.y, opts.ENTITY_SIZE, 0, 2 * pi);
        ctx.stroke();
        ctx.closePath();
        ctx.strokeStyle = 'black';
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + opts.ENTITY_SIZE * 2 * Math.cos(this.direction), this.y + opts.ENTITY_SIZE * 2 * Math.sin(this.direction));
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.destRelX, this.y + this.destRelY);
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = 'red';
        ctx.arc(this.x + this.destRelX, this.y + this.destRelY, 5, 0, 2 * pi);
        ctx.fill();
        ctx.closePath();
        if (this.type === types.predator && this.attackCooldown === 0) {
            ctx.beginPath();
            ctx.strokeStyle = 'red';
            ctx.arc(this.x, this.y, opts.ENTITY_SIZE * 1.5, 0, 2 * pi);
            ctx.stroke();
            ctx.closePath();
        }
        if (this.type === types.prey && this.props.leader) {
            ctx.beginPath();
            ctx.strokeStyle = 'cyan';
            ctx.arc(this.x, this.y, opts.ENTITY_SIZE * 1.5, 0, 2 * pi);
            ctx.stroke();
            ctx.closePath();
        }
        ctx.lineWidth = 2;
        if (this.highlight) {
            ctx.strokeStyle = 'red';
            polygon(ctx, [
                [this.x, this.y + opts.ENTITY_SIZE * 2],
                [this.x + opts.ENTITY_SIZE * 2, this.y],
                [this.x, this.y - opts.ENTITY_SIZE * 2],
                [this.x - opts.ENTITY_SIZE * 2, this.y],
            ], 'stroke');
            ctx.beginPath();
            ctx.strokeStyle = 'powderblue';
            ctx.arc(this.x, this.y, opts.ENTITY_RECOGNITION_RANGE * opts.ENTITY_SIZE, 0, 2 * pi);
            ctx.stroke();
            ctx.closePath();
        }
        if (this.touch) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,0,0,0.2)';
            ctx.arc(this.x, this.y, opts.ENTITY_SIZE * 1.4, 0, 2 * pi);
            ctx.stroke();
            ctx.closePath();
        }
    }
    move(delta) {
        this.xBuffer = this.x;
        this.yBuffer = this.y;
        let dirBuffer = 0;
        // Based on Boids https://en.wikipedia.org/wiki/Boids
        const sortedEntities = entities
            .filter((entity) => entity.uuid !== this.uuid)
            .toSorted((a, b) => d(a.x, a.y, this.xBuffer, this.yBuffer) - d(b.x, b.y, this.xBuffer, this.yBuffer));
        const sameTypeEntities = sortedEntities.filter((entity) => entity.type === this.type);
        const diffTypeEntities = sortedEntities.filter((entity) => entity.type !== this.type);
        const nearSameTypeEntities = sameTypeEntities.filter((entity) => d(entity.x, entity.y, this.xBuffer, this.yBuffer) <= opts.ENTITY_RECOGNITION_RANGE * opts.ENTITY_SIZE);
        const nearDiffTypeEntities = sortedEntities.filter((entity) => d(entity.x, entity.y, this.xBuffer, this.yBuffer) <= opts.ENTITY_RECOGNITION_RANGE * opts.ENTITY_SIZE && entity.type !== this.type);
        const closestSameTypeEntity = nearSameTypeEntities[0];
        const closestDiffTypeEntity = nearDiffTypeEntities[0];
        this.touch = '';
        if (!!closestDiffTypeEntity &&
            Math.pow((closestDiffTypeEntity.x - this.xBuffer), 2) + Math.pow((closestDiffTypeEntity.y - this.yBuffer), 2) <= Math.pow((2 * opts.ENTITY_SIZE), 2))
            this.touch = closestDiffTypeEntity.uuid;
        // Attack validation
        this.attackCooldown -= delta;
        if (this.attackCooldown < 0)
            this.attackCooldown = 0;
        if (this.touch && closestDiffTypeEntity.attackCooldown === 0 && this.type === types.prey) {
            const attackSuccess = nearSameTypeEntities.reduce((p, c) => p + c.attack, 0) > closestDiffTypeEntity.attack;
            if (!attackSuccess && closestDiffTypeEntity.attackCooldown === 0) {
                this.alive = false;
                closestDiffTypeEntity.alive = true;
                closestDiffTypeEntity.attackCooldown = opts.ENTITY_ATTACK_COOLDOWN;
            }
            else if (attackSuccess) {
                this.alive = true;
                closestDiffTypeEntity.alive = false;
            }
        }
        // Separation
        let sepDir = 0;
        if (nearSameTypeEntities.length) {
            const { x: sepX, y: sepY } = nearSameTypeEntities.reduce((prev, curr) => {
                const scaleFactor = (opts.ENTITY_RECOGNITION_RANGE / d(this.xBuffer, this.yBuffer, curr.x, curr.y)) * 0.5;
                return {
                    x: prev.x + (this.xBuffer - curr.x) * scaleFactor,
                    y: prev.y + (this.yBuffer - curr.y) * scaleFactor,
                };
            }, { x: 0, y: 0 });
            // this.destRelX = sepX
            // this.destRelY = sepY
            sepDir = Math.atan2(sepY, sepX);
        }
        // Alignment
        let alignDir = 0;
        if (nearSameTypeEntities.length) {
            const { x: alignX, y: alignY } = nearSameTypeEntities.reduce((prev, curr) => {
                return {
                    x: prev.x + Math.cos(curr.direction),
                    y: prev.y + Math.sin(curr.direction),
                };
            }, { x: 0, y: 0 });
            alignDir = Math.atan2(alignY, alignX);
        }
        // Cohesion
        let cohDir = 0;
        if (nearSameTypeEntities.length) {
            const { x: cohX, y: cohY } = nearSameTypeEntities.reduce((prev, curr) => {
                return {
                    x: prev.x + curr.x,
                    y: prev.y + curr.y,
                };
            }, { x: 0, y: 0 });
            cohDir = Math.atan2(cohY / nearSameTypeEntities.length - this.yBuffer, cohX / nearSameTypeEntities.length - this.xBuffer);
        }
        // Custom Rule .1 Targeting
        let target;
        let targetDir;
        if (modeSelection.value === 'coop' && sameTypeEntities.length > 1 && this.type === types.prey)
            target = sameTypeEntities[1];
        if (modeSelection.value === 'leader' && sameTypeEntities.filter((e) => e.props.leader).length > 1 && this.type === types.prey)
            target = sameTypeEntities.filter((e) => e.props.leader)[0];
        if (this.type === types.predator && diffTypeEntities.length > 0 && this.attackCooldown === 0)
            target = diffTypeEntities[0];
        if (target) {
            targetDir = Math.atan2(target.y - this.yBuffer, target.x - this.xBuffer);
            dirBuffer += steer(this.direction, targetDir);
        }
        // Custom Rule .2 Avoiding
        let avoid;
        let avoidDir;
        if (this.type === types.prey && diffTypeEntities.length > 0) {
            avoid = closestDiffTypeEntity;
        }
        if (avoid) {
            avoidDir = Math.atan2(this.yBuffer - avoid.y, this.xBuffer - avoid.x);
            dirBuffer += steer(this.direction, avoidDir);
        }
        // Custom Rule .3 Stay away from wall
        let wall;
        if (this.xBuffer > WIDTH / 2 - opts.ENTITY_SIZE * 3)
            wall = new Entity(0, this.y, 0, 0, types.predator);
        if (this.xBuffer < -WIDTH / 2 + opts.ENTITY_SIZE * 3)
            wall = new Entity(0, this.y, 0, 0, types.predator);
        if (this.yBuffer > HEIGHT / 2 - opts.ENTITY_SIZE * 3)
            wall = new Entity(this.x, 0, 0, 0, types.predator);
        if (this.yBuffer < -HEIGHT / 2 + opts.ENTITY_SIZE * 3)
            wall = new Entity(this.x, 0, 0, 0, types.predator);
        if (wall) {
            const avoidWallDir = Math.atan2(this.yBuffer - wall.y, this.xBuffer - wall.x);
            dirBuffer += steer(this.direction, avoidWallDir);
        }
        // Apply Steer
        if (nearSameTypeEntities.length)
            dirBuffer +=
                steer(this.direction, sepDir) * opts.SEPARATION_FACTOR +
                    steer(this.direction, alignDir) * opts.ALIGNMENT_FACTOR +
                    steer(this.direction, cohDir) * opts.COHESION_FACTOR;
        this.direction += dirBuffer * delta;
        // Wall bounce
        if (this.xBuffer > WIDTH / 2 - opts.ENTITY_SIZE) {
            this.direction = (pi - this.direction).mod(2 * pi);
            this.xBuffer = WIDTH / 2 - opts.ENTITY_SIZE;
        }
        if (this.xBuffer < -WIDTH / 2 + opts.ENTITY_SIZE) {
            this.direction = (pi - this.direction).mod(2 * pi);
            this.xBuffer = -WIDTH / 2 + opts.ENTITY_SIZE;
        }
        if (this.yBuffer > HEIGHT / 2 - opts.ENTITY_SIZE) {
            this.direction = (2 * pi - this.direction).mod(2 * pi);
            this.yBuffer = HEIGHT / 2 - opts.ENTITY_SIZE;
        }
        if (this.yBuffer < -HEIGHT / 2 + opts.ENTITY_SIZE) {
            this.direction = (2 * pi - this.direction).mod(2 * pi);
            this.yBuffer = -HEIGHT / 2 + opts.ENTITY_SIZE;
        }
        // Advance
        this.direction = this.direction.mod(2 * pi);
        this.xBuffer = this.xBuffer + opts.ENTITY_SPEED * Math.cos(this.direction) * delta;
        this.yBuffer = this.yBuffer + opts.ENTITY_SPEED * Math.sin(this.direction) * delta;
        // this.xBuffer = (this.xBuffer + opts.ENTITY_SPEED * Math.cos(this.direction) * delta + WIDTH / 2).mod(WIDTH) - WIDTH / 2
        // this.yBuffer = (this.yBuffer + opts.ENTITY_SPEED * Math.sin(this.direction) * delta + HEIGHT / 2).mod(HEIGHT) - HEIGHT / 2
    }
}
const [WIDTH, HEIGHT] = [1000, 1000];
const renderer = new Renderer(WIDTH, HEIGHT, container);
const mouse = { x: 0, y: 0, down: false };
const keyState = {};
window.addEventListener('keydown', (e) => (keyState[e.code] = true));
window.addEventListener('keyup', (e) => (keyState[e.code] = false));
let opts = {
    ENTITY_SIZE: 7,
    ENTITY_RECOGNITION_RANGE: 7,
    ENTITY_ATTACK_MAX: 100,
    ENTITY_ATTACK_COOLDOWN: 5,
    PREY_PERCENTAGE: 80,
    ENTITES_COUNT: 100,
    ENTITY_SPEED: 50,
    SEPARATION_FACTOR: 1,
    ALIGNMENT_FACTOR: 0,
    COHESION_FACTOR: 0,
    SIMULATION_ACCELERATION: 1,
};
Object.keys(opts).forEach((o) => {
    const initialValue = opts[o];
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.innerText = o;
    const input = document.createElement('input');
    input.type = 'number';
    input.setAttribute('step', '1');
    input.value = opts[o];
    const onChange = (e) => {
        opts[o] = e.target.value;
    };
    input.addEventListener('input', onChange);
    input.id = o;
    const resetBtnTd = document.createElement('td');
    const resetBtn = document.createElement('button');
    resetBtn.addEventListener('click', (e) => {
        input.value = initialValue;
        opts[o] = initialValue;
    });
    resetBtn.innerText = 'reset';
    resetBtnTd.append(resetBtn);
    tr.append(td);
    tr.append(input);
    tr.append(resetBtnTd);
    options.appendChild(tr);
});
let entities = [];
/* early declare */
const randoms = (n) => [...window.crypto.getRandomValues(new Uint8Array(n))].map((s) => s / Math.pow(2, 8));
let preyCount = 0;
let predatorCount = 0;
let time = 0;
function resetEntities() {
    entities = Array.from({ length: opts.ENTITES_COUNT }, (_, i) => {
        const rans = randoms(6);
        const type = rans[4] < opts.PREY_PERCENTAGE / 100 ? types.prey : types.predator;
        type === types.predator ? predatorCount++ : preyCount++;
        let entity = new Entity(rans[0] * (WIDTH * 0.9) - WIDTH * 0.45, rans[1] * (HEIGHT * 0.9) - HEIGHT * 0.45, rans[2] * 2 * pi, 
        // Math.cos(2 * pi * i / opts.ENTITES_COUNT) * 100, Math.sin(2 * pi * i / opts.ENTITES_COUNT) * 100,
        // 2 * pi * i / opts.ENTITES_COUNT,
        rans[3] * 0.7 * opts.ENTITY_ATTACK_MAX + (type === types.predator ? 0.3 * opts.ENTITY_ATTACK_MAX : 0), type);
        if (modeSelection.value === 'leader' && entity.type === types.prey)
            entity.props.leader = rans[5] > 0.9;
        return entity;
    });
}
resetEntities();
renderer.registerListener([
    [
        'mousemove',
        (e) => {
            const { layerX, layerY } = e;
            mouse.x = layerX - WIDTH / 2;
            mouse.y = -(layerY - WIDTH / 2);
            // entities.filter(entity => {
            //     // entity.highlight = (entity.x - mouse.x) ** 2 + (entity.y - mouse.y) ** 2 <= opts.ENTITY_RADIOUS ** 2
            //     return (entity.x - mouse.x) ** 2 + (entity.y - mouse.y) ** 2 <= opts.ENTITY_RADIOUS ** 2
            // })
        },
    ],
    ['mousedown', (e) => (mouse.down = true)],
    ['mouseup', (e) => (mouse.down = false)],
    [
        'click',
        (e) => {
            const closestEntity = entities.toSorted((a, b) => Math.pow((a.x - mouse.x), 2) + Math.pow((a.y - mouse.y), 2) - (Math.pow((b.x - mouse.x), 2) + Math.pow((b.y - mouse.y), 2)))[0];
            // TODO: closest entity select
            if (Math.pow((closestEntity.x - mouse.x), 2) + Math.pow((closestEntity.y - mouse.y), 2) <= Math.pow(opts.ENTITY_SIZE, 2))
                closestEntity.highlight = !closestEntity.highlight;
        },
    ],
]);
resetBtn.addEventListener('click', resetEntities);
pauseBtn.addEventListener('click', (e) => {
    renderer.pause = !renderer.pause;
    e.target.innerText = renderer.pause ? 'Start' : 'Pause';
    if (!renderer.pause) {
        renderer.lastTime = Date.now();
        renderer.step();
    }
    console.log(renderer.pause ? 'Simulation stopped' : 'Simulation started');
});
importBtn.addEventListener('click', () => {
    opts = JSON.parse(settingsTextarea.value);
    Object.keys(opts).forEach((e) => (document.getElementById(e).value = opts[e]));
    modeSelection.value = opts['mode'];
});
exportBtn.addEventListener('click', () => {
    settingsTextarea.value = JSON.stringify(Object.assign(Object.assign({}, opts), { mode: modeSelection.value }), null, 2);
});
resetLogBtn.addEventListener('click', () => {
    logTextarea.value = '[\n]';
});
document.addEventListener('visibilitychange', () => {
    renderer.isRun = !document.hidden;
    console.log(renderer.isRun ? 'Screen is visible' : 'Screen is not visible');
    if (renderer.isRun) {
        renderer.lastTime = Date.now();
        renderer.step();
    }
});
function draw(ctx, delta, demension) {
    // ctx.fillText(`${this.delta}`, 100, 100)
    entities.forEach((entity) => {
        entity.draw(ctx);
    });
}
function* presetting(o, min, max, step) {
    const preOpts = structuredClone(opts);
    const result = structuredClone(opts);
    let i = min;
    while (i <= max) {
        result[o] = i;
        console.log(result);
        Object.keys(opts).forEach((e) => (document.getElementById(e).value = result[e]));
        i += step;
        for (let i = 0; i < parseFloat(iterLoop.value); i++) {
            yield result;
        }
    }
    useIter = false;
    Object.keys(opts).forEach((e) => (document.getElementById(e).value = preOpts[e]));
    pauseBtn.click();
    yield preOpts;
}
let iter;
let useIter = false;
iterStartBtn.addEventListener('click', () => {
    iter = presetting(iterInput.value, parseFloat(iterMin.value), parseFloat(iterMax.value), parseFloat(iterStep.value));
    logTextarea.value = '[\n]';
    useIter = true;
    opts = iter.next().value;
    resetEntities();
});
function update(delta) {
    entities = entities.filter((entity) => entity.alive);
    entities.forEach((entity) => entity.move(delta * opts.SIMULATION_ACCELERATION));
    entities.forEach((entity) => {
        entity.x = entity.xBuffer;
        entity.y = entity.yBuffer;
    });
    const types = new Set(entities.map((e) => e.type));
    if (types.size === 1) {
        const winner = types.values().next().value;
        const data = {
            prey: preyCount,
            predator: predatorCount,
            prey_predator_ratio: preyCount / predatorCount,
            time_take: Math.floor(time * 1000) / 1000,
            settings: Object.assign(Object.assign({}, opts), { mode: modeSelection.value }),
            winner,
        };
        logTextarea.value = logTextarea.value.slice(0, -1) + `${JSON.stringify(data, null, 2)},\n]`;
        predatorCount = 0;
        preyCount = 0;
        time = 0;
        resetEntities();
        if (useIter) {
            opts = iter.next().value;
        }
    }
    time += delta * opts.SIMULATION_ACCELERATION;
    renderDebug([
        [mouse, 'mouse'],
        [delta, 'delta'],
        [Math.floor(time * 1000) / 1000, 'time'],
        [entities.filter((e) => e.highlight), 'highlighted entity'],
    ]);
}
renderer.run(draw, update);
/*===============UTILITY FUNCTIONS============*/
const steer = (dir0, dir) => ((dir - dir0).mod(2 * pi) < pi ? 1 : -1);
function renderDebug(items) {
    debug.innerText = '';
    items.forEach((item) => {
        debug.innerText += `\n${item[1]}\n${JSON.stringify(item[0], null, 2)}\n`;
    });
}
function polygon(ctx, points, mode = 'stroke') {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    points.forEach((point) => ctx.lineTo(...point));
    ctx.closePath();
    mode === 'stroke' ? ctx.stroke() : ctx.fill();
}
const d = (x1, y1, x2, y2) => Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s == 0) {
        r = g = b = l; // achromatic
    }
    else {
        function hue2rgb(p, q, t) {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.floor(r * 255), g: Math.floor(g * 255), b: Math.floor(b * 255) };
}
Number.prototype.mod = function (n) {
    return ((this % n) + n) % n;
};
