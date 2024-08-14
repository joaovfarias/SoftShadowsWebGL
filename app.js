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

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_textureMatrix;

out vec2 v_texcoord;
out vec4 v_projectedTexcoord;
out vec3 v_normal;

void main() {
  // Multiply the position by the matrix.
  vec4 worldPosition = u_world * a_position;

  gl_Position = u_projection * u_view * worldPosition;

  // Pass the texture coord to the fragment shader.
  v_texcoord = a_texcoord;

  v_projectedTexcoord = u_textureMatrix * worldPosition;

  // orient the normals and pass to the fragment shader
  v_normal = mat3(u_world) * a_normal;
}
`;

const fs = `#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec2 v_texcoord;
in vec4 v_projectedTexcoord;
in vec3 v_normal;

uniform vec4 u_colorMult;
uniform sampler2D u_texture;
uniform sampler2D u_projectedTexture;
uniform float u_bias;
uniform vec3 u_reverseLightDirection;

out vec4 outColor;

// Define the size of the PCF kernel (e.g., 3x3)
const float kernelSize = 12.0;
const float kernelHalfSize = (kernelSize - 1.0) * 0.5;

// Adjust this to control the size of the shadow's softness
const float texelSize = 1.0 / 256.0; 

// Shadow intensity factor (0 = no shadow, 1 = full shadow)
const float shadowIntensity = 0.9;

// Ambient light factor
const float ambientLight = 0.2;

void main() {
  // Normalize the interpolated normal vector
  vec3 normal = normalize(v_normal);

  // Calculate the amount of light based on the angle between the light direction and the surface normal
  float light = dot(normal, u_reverseLightDirection);

  // Calculate the projected texture coordinates
  vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;
  float currentDepth = projectedTexcoord.z + u_bias;

  // Check if the projected coordinates are in range
  bool inRange =
      projectedTexcoord.x >= 0.0 &&
      projectedTexcoord.x <= 1.0 &&
      projectedTexcoord.y >= 0.0 &&
      projectedTexcoord.y <= 1.0;

  // Initialize shadowLight for PCF
  float shadowLight = 1.0;

  if (inRange) {
    // Perform PCF by averaging depth comparisons in a 3x3 kernel
    float shadowSamples = 0.0;
    for (float x = -kernelHalfSize; x <= kernelHalfSize; x += 1.0) {
      for (float y = -kernelHalfSize; y <= kernelHalfSize; y += 1.0) {
        vec2 offset = vec2(x, y) * texelSize;
        float sampledDepth = texture(u_projectedTexture, projectedTexcoord.xy + offset).r;
        shadowSamples += (sampledDepth <= currentDepth) ? 0.0 : 1.0;
      }
    }
    shadowLight = shadowSamples / (kernelSize * kernelSize); // Average the results
  }

  // Blend shadow with ambient and intensity
  float shadowFactor = mix(1.0, shadowLight, shadowIntensity) + ambientLight;

  // Ensure shadowFactor is clamped to 1.0
  shadowFactor = clamp(shadowFactor, 0.0, 1.0);

  // Fetch the texture color and apply the lighting
  vec4 texColor = texture(u_texture, v_texcoord) * u_colorMult;
  outColor = vec4(
      texColor.rgb * light * shadowFactor,
      texColor.a);
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

function main() {
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

  const sphereBufferInfo = twgl.primitives.createSphereBufferInfo(
    gl,
    2,  // radius
    32, // subdivisions around
    24, // subdivisions down
);
  const sphereVAO = twgl.createVAOFromBufferInfo(
    gl, textureProgramInfo, sphereBufferInfo);

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

  const settings = {
    cameraX: 6,
    cameraY: 12,
    cameraZ: 2.5,
    posX: 2.5,
    posY: 10,
    posZ: 20,
    targetX: 3.5,
    targetY: 0,
    targetZ: 3.5,
    projWidth: 10,
    projHeight: 10,
    perspective: true,
    fieldOfView: 60,
    bias: -0.0010,
  };

  const fieldOfViewRadians = degToRad(60);

  // Uniforms for each object.
  const planeUniforms = {
    u_colorMult: [0.4, 0.4, 0.4, 1],  
    u_color: [1, 0, 0, 1],
    u_texture: twgl.createTexture(gl, {src: [255, 255, 255, 255]}),
    u_world: m4.translation(0, 0, 0)
  };
  const sphereUniforms = {
    u_colorMult: [1, 0, 1, 1],  
    u_color: [0, 0, 1, 1],
    u_texture: twgl.createTexture(gl, {src: [255, 255, 255, 255]}),
    u_world: m4.translation(0, 2, 10),
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

    // ------ Draw the sphere --------

    // Setup all the needed attributes.
    gl.bindVertexArray(sphereVAO);

    // Set the uniforms unique to the sphere
    twgl.setUniforms(programInfo, sphereUniforms);

    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(gl, sphereBufferInfo);

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

    requestAnimationFrame(render);
  }

  render();
}

main();
