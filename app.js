function fitToContainer(canvas){
    // Make it visually fill the positioned parent
    canvas.style.width ='100%';
    canvas.style.height='100%';
    // ...then set the internal size to match
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight + 750;
}


'use strict';

const vs = `#version 300 es
in vec4 a_position;
in vec2 a_texcoord;
in vec3 a_normal;
in vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_textureMatrix;
uniform vec3 u_viewWorldPosition;

out vec2 v_texcoord;
out vec4 v_projectedTexcoord;
out vec3 v_normal;
out vec3 v_surfaceToView;
out vec4 v_color;

void main() {
  vec4 worldPosition = u_world * a_position;
  gl_Position = u_projection * u_view * worldPosition;

  v_texcoord = a_texcoord;
  v_projectedTexcoord = u_textureMatrix * worldPosition;
  v_normal = mat3(u_world) * a_normal;
  v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
  v_color = a_color;
}
`;



const fs = `#version 300 es
precision highp float;

in vec2 v_texcoord;
in vec4 v_projectedTexcoord;
in vec3 v_normal;
in vec3 v_surfaceToView;
in vec4 v_color;

uniform vec4 u_colorMult;
uniform sampler2D u_texture;
uniform sampler2D u_projectedTexture;
uniform sampler2D specularMap;
uniform float u_bias;
uniform vec3 u_reverseLightDirection;
uniform vec3 diffuse;
uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
uniform vec3 u_lightDirection;
uniform vec3 u_ambientLight;

// PCF kernel parameters
const float kernelSize = 12.0;
const float kernelHalfSize = (kernelSize - 1.0) * 0.5;
const float texelSize = 1.0 / 256.0;
const float shadowIntensity = 0.9;
const float ambientLight = 0.2;

out vec4 outColor;

void main() {
  vec3 normal = normalize(v_normal);
  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

  float light = dot(normal, u_reverseLightDirection);
  float fakeLight = dot(u_lightDirection, normal) * 0.5 + 0.5;
  float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
  vec4 specularMapColor = texture(specularMap, v_texcoord);
  vec3 effectiveSpecular = specular * specularMapColor.rgb;

  vec4 diffuseMapColor = texture(u_texture, v_texcoord);
  vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
  float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;

  // Calculate the projected texture coordinates for shadow mapping
  vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;
  float currentDepth = projectedTexcoord.z + u_bias;

  bool inRange =
      projectedTexcoord.x >= 0.0 &&
      projectedTexcoord.x <= 1.0 &&
      projectedTexcoord.y >= 0.0 &&
      projectedTexcoord.y <= 1.0;

  float shadowLight = 1.0;
  if (inRange) {
    float shadowSamples = 0.0;
    for (float x = -kernelHalfSize; x <= kernelHalfSize; x += 1.0) {
      for (float y = -kernelHalfSize; y <= kernelHalfSize; y += 1.0) {
        vec2 offset = vec2(x, y) * texelSize;
        float sampledDepth = texture(u_projectedTexture, projectedTexcoord.xy + offset).r;
        shadowSamples += (sampledDepth <= currentDepth) ? 0.0 : 1.0;
      }
    }
    shadowLight = shadowSamples / (kernelSize * kernelSize);
  }

  float shadowFactor = mix(1.0, shadowLight, shadowIntensity) + ambientLight;
  shadowFactor = clamp(shadowFactor, 0.0, 1.0);

  vec3 finalLight = emissive +
                    ambient * u_ambientLight +
                    effectiveDiffuse * fakeLight * shadowFactor +
                    effectiveSpecular * pow(specularLight, shininess);

  outColor = vec4(finalLight, effectiveOpacity);
}
`;


const colorVS = `#version 300 es
in vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

void main() {
  // Multiply the position by the matrices.
  gl_Position = u_projection * u_view * u_world * a_position;
}
`;

const colorFS = `#version 300 es
precision highp float;

uniform vec4 u_color;

out vec4 outColor;

void main() {
  outColor = u_color;
}
`;

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector('#canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    return;
  }

  fitToContainer(canvas);

  // setup GLSL programs
  // note: Since we're going to use the same VAO with multiple
  // shader programs we need to make sure all programs use the
  // same attribute locations. There are 2 ways to do that.
  // (1) assign them in GLSL. (2) assign them by calling `gl.bindAttribLocation`
  // before linking. We're using method 2 as it's more. D.R.Y.
  const programOptions = {
    attribLocations: {
      'a_position': 0,
      'a_normal':   1,
      'a_texcoord': 2,
      'a_color':    3,
    },
  };
  const textureProgramInfo = twgl.createProgramInfo(gl, [vs, fs], programOptions);
  const colorProgramInfo = twgl.createProgramInfo(gl, [colorVS, colorFS], programOptions);

  // Tell the twgl to match position with a_position,
  // normal with a_normal etc..
  twgl.setAttributePrefix("a_");


  const planeBufferInfo = twgl.primitives.createPlaneBufferInfo(
      gl,
      90,  // width
      90,  // height
      1,   // subdivisions across
      1,   // subdivisions down
  );
  const planeVAO = twgl.createVAOFromBufferInfo(
      gl, textureProgramInfo, planeBufferInfo);

  const cubeLinesBufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: [
      -1, -1, -1,
       1, -1, -1,
      -1,  1, -1,
       1,  1, -1,
      -1, -1,  1,
       1, -1,  1,
      -1,  1,  1,
       1,  1,  1,
    ],
    indices: [
      0, 1,
      1, 3,
      3, 2,
      2, 0,

      4, 5,
      5, 7,
      7, 6,
      6, 4,

      0, 4,
      1, 5,
      3, 7,
      2, 6,
    ],
  });
  const cubeLinesVAO = twgl.createVAOFromBufferInfo(
      gl, colorProgramInfo, cubeLinesBufferInfo);

  const depthTexture = gl.createTexture();
  const depthTextureSize = 256;
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
      gl.TEXTURE_2D,      // target
      0,                  // mip level
      gl.DEPTH_COMPONENT32F, // internal format
      depthTextureSize,   // width
      depthTextureSize,   // height
      0,                  // border
      gl.DEPTH_COMPONENT, // format
      gl.FLOAT,           // type
      null);              // data
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,       // target
      gl.DEPTH_ATTACHMENT,  // attachment point
      gl.TEXTURE_2D,        // texture target
      depthTexture,         // texture
      0);                   // mip level

  function degToRad(d) {
    return d * Math.PI / 180;
  }

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


  const testFileName = 'assets/Shop-0-ShopBuilding_1.obj'
  const mtlFileName = 'assets/Shop-0-ShopBuilding_1.mtl'
  const texFileName = 'assets/Shop-0-ShopBuilding_1.png'

  const [testText, mtlText] = await Promise.all([
    loadFile(testFileName),
    loadFile(mtlFileName)
  ]);
  const obj = parseOBJ(testText);
  const materials = parseMTL(mtlText);

  loadTexture(materials, texFileName, textures, gl)

  objParts = createParts(gl, textureProgramInfo, obj, materials);


  const settings = {
    cameraX: 100,
    cameraY: 33.3,
    cameraZ: 9.1,
    posX: -0.1,
    posY: 21.8,
    posZ: 64.4,
    targetX: -2.4,
    targetY: -1.2,
    targetZ: 8,
    projWidth: 14.9,
    projHeight: 10.3,
    perspective: true,
    fieldOfView: 31.4,
    bias: -0.001,
  };

  const fieldOfViewRadians = degToRad(60);

  // Uniforms for each object.
  const planeUniforms = {
    u_colorMult: [0.4, 0.4, 0.4, 1],  
    u_color: [1, 0, 0, 1],
    u_texture: twgl.createTexture(gl, {src: [255, 255, 255, 255]}),
    u_world: m4.translation(0, 0, 0)
  };


  function drawScene(
      projectionMatrix,
      cameraMatrix,
      textureMatrix,
      lightWorldMatrix,
      programInfo) {
    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);

    gl.useProgram(programInfo.program);

    // set uniforms that are the same for both the sphere and plane
    // note: any values with no corresponding uniform in the shader
    // are ignored.
    twgl.setUniforms(programInfo, {
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_bias: settings.bias,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: depthTexture,
      u_reverseLightDirection: lightWorldMatrix.slice(8, 11),
    });

    gl.bindVertexArray(objParts[0].vao);

    twgl.setUniforms(programInfo, {
      u_world: m4.translation(0, 10, 0),
      u_colorMult: [1, 1, 1, 1],
      u_color: [1, 1, 1, 1],
      u_texture: objParts[0].material.diffuseMap,
    });

    twgl.drawBufferInfo(gl, objParts[0].bufferInfo);

    // ------ Draw the plane --------

    // Setup all the needed attributes.
    gl.bindVertexArray(planeVAO);

    // Set the uniforms unique to the cube
    twgl.setUniforms(programInfo, planeUniforms);

    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(gl, planeBufferInfo);
  }

  // Draw the scene.
  function render() {
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // first draw from the POV of the light
    const lightWorldMatrix = m4.lookAt(
        [settings.posX, settings.posY, settings.posZ],          // position
        [settings.targetX, settings.targetY, settings.targetZ], // target
        [0, 1, 0],                                              // up
    );
    const lightProjectionMatrix = settings.perspective
        ? m4.perspective(
            degToRad(settings.fieldOfView),
            settings.projWidth / settings.projHeight,
            0.5,  // near
            1000)   // far
        : m4.orthographic(
            -settings.projWidth / 2,   // left
             settings.projWidth / 2,   // right
            -settings.projHeight / 2,  // bottom
             settings.projHeight / 2,  // top
             0.5,                      // near
             10);                      // far

    // draw to the depth texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawScene(
        lightProjectionMatrix,
        lightWorldMatrix,
        m4.identity(),
        lightWorldMatrix,
        colorProgramInfo);

    // now draw scene to the canvas projecting the depth texture into the scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(186/255, 219/255, 212/255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let textureMatrix = m4.identity();
    textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
    // use the inverse of this world matrix to make
    // a matrix that will transform other positions
    // to be relative this this world space.
    textureMatrix = m4.multiply(
        textureMatrix,
        m4.inverse(lightWorldMatrix));

    // Compute the projection matrix
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix =
        m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    // Compute the camera's matrix using look at.
    const cameraPosition = [settings.cameraX, settings.cameraY, settings.cameraZ];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    drawScene(
        projectionMatrix,
        cameraMatrix,
        textureMatrix,
        lightWorldMatrix,
        textureProgramInfo);

    // ------ Draw the frustum ------
    {
      const viewMatrix = m4.inverse(cameraMatrix);

      gl.useProgram(colorProgramInfo.program);

      // Setup all the needed attributes.
      gl.bindVertexArray(cubeLinesVAO);

      // scale the cube in Z so it's really long
      // to represent the texture is being projected to
      // infinity
      const mat = m4.multiply(
          lightWorldMatrix, m4.inverse(lightProjectionMatrix));

      // Set the uniforms we just computed
      twgl.setUniforms(colorProgramInfo, {
        u_color: [1, 1, 1, 1],
        u_view: viewMatrix,
        u_projection: projectionMatrix,
        u_world: mat,
      });

      // calls gl.drawArrays or gl.drawElements
      twgl.drawBufferInfo(gl, cubeLinesBufferInfo, gl.LINES);
    }

    settings.cameraX = parseFloat(document.getElementById("cameraX").value);
    settings.cameraY = parseFloat(document.getElementById("cameraY").value);
    settings.cameraZ = parseFloat(document.getElementById("cameraZ").value);
    settings.posX = parseFloat(document.getElementById("posX").value);
    settings.posY = parseFloat(document.getElementById("posY").value);
    settings.posZ = parseFloat(document.getElementById("posZ").value);
    settings.targetX = parseFloat(document.getElementById("targetX").value);
    settings.targetY = parseFloat(document.getElementById("targetY").value);
    settings.targetZ = parseFloat(document.getElementById("targetZ").value);
    settings.projWidth = parseFloat(document.getElementById("projWidth").value);
    settings.projHeight = parseFloat(document.getElementById("projHeight").value);
    settings.fieldOfView = parseFloat(document.getElementById("Fov").value);
    settings.bias = parseFloat(document.getElementById("bias").value);

    requestAnimationFrame(render);
  }

  render();
}

main();
