const gl = canvas.getContext('webgl2');

const textures = {
defaultWhite: twgl.createTexture(gl, {src: [255, 255, 255, 255]}),
defaultGreen: twgl.createTexture(gl, {src: [3, 46, 15, 255]})
};

const defaultMaterial = {
diffuse: [1, 1, 1],
diffuseMap: textures.defaultGreen,
ambient: [0, 0, 0],
specular: [1, 1, 1],
specularMap: textures.defaultGreen,
shininess: 400,
opacity: 1,
};


function loadTexture(objectMaterial, source, textures, gl) {
    for (const material of Object.values(objectMaterial)) {
      Object.entries(material)
        .filter(([key]) => key.endsWith('Map'))
        .forEach(([key, filename]) => {
          let texture = textures[filename];
          if (!texture) {
            texture = twgl.createTexture(gl, {src: source, flipY: true});
            textures[filename] = texture;
          }
          material[key] = texture;
        });
    }
}

async function loadFile(file) {
const response = await fetch(file);
if (!response.ok) {
    throw new Error('Network response was not ok');
}
return response.text();
}

function createParts(gl, programInfo, obj, materials) {
return obj.geometries.map(({material, data}) => {
    if (data.color) {
    if (data.position.length === data.color.length) {
        data.color = {numComponents: 3, data: data.color};
    }
    } else {
    data.color = {value: [1, 1, 1, 1]};
    }

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo);

    return {
    material: {...defaultMaterial, ...materials[material]},
    bufferInfo,
    vao,
    };
});
}

async function createObjectParts(gl, programInfo, FileName, MtlFileName, TexFileName) {
    const [objText, mtlText] = await Promise.all([
        loadFile(FileName),
        loadFile(MtlFileName),
    ]);

    const objObj = parseOBJ(objText);
    const objMaterials = parseMTL(mtlText);

    loadTexture(objMaterials, TexFileName, textures, gl);

    return createParts(gl, programInfo, objObj, objMaterials);
}


