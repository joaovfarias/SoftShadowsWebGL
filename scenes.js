let currentSceneIndex = 0;
let time = 0;
const frequency = 0.5;
let moveLight = false;
let moveCars = false;
let falling = false;
let zNear = 0.1;

const settings = {
    cameraX: -41.3, cameraY: 24.9, cameraZ: -36.9,
        posX: 33.6, posY: 27.8, posZ: -10,
        targetX: 9.1, targetY: 4.8, targetZ: 1.9,
        projWidth: 100, projHeight: 50, perspective: false,
        fieldOfView: 51.2, bias: -0.01
};

document.getElementById('changeSceneButton').addEventListener('click', () => {
    currentSceneIndex = (currentSceneIndex + 1) % scenes.length;
    const scene = scenes[currentSceneIndex];
    for (const key in scene) {
      settings[key] = scene[key];
    }

    if (moveCars && !falling) {
        if (car2Translation[0] + 5 < 15) {
            car2Translation[0] += 5
        }
        if (car3Translation[0] - 4 > -15) {
            car3Translation[0] -= 4
        }
    }
});

document.getElementById('resetButton').addEventListener('click', () => {
    time = 0;
    car2Translation = [15, 1.5, -20.7];
    car2Rotation = [0, degToRad(-180), 0];
    car3Translation = [-15, 1.5, -16.5];
    car3Rotation = [0, 0, 0];
    moveCars = false;

});	

document.getElementById('moveLightButton').addEventListener('click', () => {
    moveLight = !moveLight;
});

document.getElementById('moveCarsButton').addEventListener('click', () => {
    moveCars = !moveCars;
});

document.getElementById('toggleShadowsButton').addEventListener('click', () => {
    zNear = zNear === 0.1 ? 100 : 0.1;
});

const scenes = [
    {
        cameraX: -41.3, cameraY: 24.9, cameraZ: -36.9,
        posX: 33.6, posY: 27.8, posZ: -10,
        targetX: 9.1, targetY: 4.8, targetZ: 1.9,
        projWidth: 100, projHeight: 50, perspective: false,
        fieldOfView: 51.2, bias: -0.01
    },
    {
        cameraX: 45.1, cameraY: 40.8, cameraZ: 27.8,
        posX: 33.6, posY: 27.8, posZ: -10,
        targetX: 9.1, targetY: 4.8, targetZ: 1.9,
        projWidth: 100, projHeight: 50, perspective: false,
        fieldOfView: 51.2, bias: -0.01
    },
    {
        cameraX: 42.5, cameraY: 12.3, cameraZ: -0.7,
        posX: 33.6, posY: 27.8, posZ: -10,
        targetX: 9.1, targetY: 4.8, targetZ: 1.9,
        projWidth: 100, projHeight: 50, perspective: false,
        fieldOfView: 51.2, bias: -0.01
    },
    {
        cameraX: -42.5, cameraY: 30, cameraZ: 20.3,
        posX: 33.6, posY: 27.8, posZ: -10,
        targetX: 9.1, targetY: 4.8, targetZ: 1.9,
        projWidth: 100, projHeight: 50, perspective: false,
        fieldOfView: 51.2, bias: -0.01
    }

];