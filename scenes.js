let currentSceneIndex = 0;

const settings = {
    cameraX: -41.3, cameraY: 24.9, cameraZ: -36.9,
        posX: 33.6, posY: 27.8, posZ: 7.7,
        targetX: 9.1, targetY: 4.8, targetZ: 1.9,
        projWidth: 14.9, projHeight: 10, perspective: true,
        fieldOfView: 51.2, bias: -0.0009
};

document.getElementById('changeSceneButton').addEventListener('click', () => {
    currentSceneIndex = (currentSceneIndex + 1) % scenes.length;
    const scene = scenes[currentSceneIndex];
    for (const key in scene) {
      settings[key] = scene[key];
    }
  });

const scenes = [
    {
        cameraX: -41.3, cameraY: 24.9, cameraZ: -36.9,
        posX: 33.6, posY: 27.8, posZ: 7.7,
        targetX: 9.1, targetY: 4.8, targetZ: 1.9,
        projWidth: 14.9, projHeight: 10, perspective: true,
        fieldOfView: 51.2, bias: -0.0009
    },
    {
        cameraX: 45.1, cameraY: 40.8, cameraZ: 27.8,
        posX: 23.5, posY: 23.5, posZ: -29.7,
        targetX: 3.5, targetY: 0, targetZ: 3.5,
        projWidth: 14.9, projHeight: 10, perspective: true,
        fieldOfView: 75.9, bias: -0.0009
    },
    {
        cameraX: 42.5, cameraY: 12.3, cameraZ: -0.7,
        posX: -7.9, posY: 28.1, posZ: -23.7,
        targetX: 3.5, targetY: 0, targetZ: 3.5,
        projWidth: 14.9, projHeight: 10, perspective: true,
        fieldOfView: 92.7, bias: -0.0009
    }
];