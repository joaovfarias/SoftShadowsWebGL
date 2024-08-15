function fitToContainer(canvas){
    // Make it visually fill the positioned parent
    canvas.style.width ='100%';
    canvas.style.height='100%';
    // ...then set the internal size to match
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

function drawParts(objectParts, position, scale, rotation, programInfo) {
  for (const {bufferInfo, vao, material} of objectParts) {
    gl.bindVertexArray(vao);

    let u_world = m4.identity();
    u_world = m4.translate(u_world, position[0], position[1], position[2]);
    u_world = m4.scale(u_world, scale[0], scale[1], scale[2]);
    u_world = m4.xRotate(u_world, rotation[0]);
    u_world = m4.yRotate(u_world, rotation[1]);
    u_world = m4.zRotate(u_world, rotation[2]);

    twgl.setUniforms(programInfo, {
      u_world,
    }, material);

    twgl.drawBufferInfo(gl, bufferInfo);
  }
}


async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector('#canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    return;
  }

  fitToContainer(canvas);

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

  twgl.setAttributePrefix("a_");
  let time = 0; 
  const frequency = 0.005;

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
  const depthTextureSize = 512;
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


  const fieldOfViewRadians = degToRad(60);

  const shopParts = await createObjectParts(gl, textureProgramInfo, 'assets/shop.obj', 'assets/shop.mtl', 'assets/shop.png');
  const groundParts = await createObjectParts(gl, textureProgramInfo, 'assets/ground.obj', 'assets/ground.mtl', 'assets/ground.png');
  const shop2Parts = await createObjectParts(gl, textureProgramInfo, 'assets/shop2.obj', 'assets/shop2.mtl', 'assets/shop2.png');
  const carParts = await createObjectParts(gl, textureProgramInfo, 'assets/car.obj', 'assets/car.mtl', 'assets/car.png');
  const car2Parts = await createObjectParts(gl, textureProgramInfo, 'assets/car.obj', 'assets/car.mtl', 'assets/car.png');
  const car3Parts = await createObjectParts(gl, textureProgramInfo, 'assets/car.obj', 'assets/car.mtl', 'assets/car.png');
  const cabinParts = await createObjectParts(gl, textureProgramInfo, 'assets/cabin.obj', 'assets/cabin.mtl', 'assets/cabin.png');

  function drawScene(projectionMatrix, cameraMatrix, textureMatrix, lightWorldMatrix, programInfo) {
    const viewMatrix = m4.inverse(cameraMatrix);

    gl.useProgram(programInfo.program);

    twgl.setUniforms(programInfo, {
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_bias: settings.bias,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: depthTexture,
      u_reverseLightDirection: lightWorldMatrix.slice(8, 11),
    });

    drawParts(shopParts, [10, 5.15, 17 - 3.5], [1.3, 1.3, 1.3], [0, 0, 0], programInfo);
    drawParts(groundParts, [0, 0, 0], [2.1, 1, 1.5], [0, 0, 0], programInfo);
    drawParts(shop2Parts, [-9, 4.8, 9.5 - 3.5], [1.3, 1.3, 1.3], [0, 0, 0], programInfo);
    drawParts(carParts, [5, 1.5, 4.7 - 3.5], [1.8, 1.8, 1.8], [0, degToRad(-90), 0], programInfo);
    drawParts(car2Parts, [15, 1.5, -14.7], [1.8, 1.8, 1.8], [0, degToRad(-180), 0], programInfo);
    drawParts(car3Parts, [-15, 1.5, -17], [1.8, 1.8, 1.8], [0, degToRad(0), 0], programInfo);
    drawParts(cabinParts, [-15, 2, 0], [1, 1, 1], [0, 0, 0], programInfo);

  }

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
             1000);                      // far

    // draw to the depth texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawScene(lightProjectionMatrix, lightWorldMatrix, m4.identity(), lightWorldMatrix, colorProgramInfo);

    // now draw scene to the canvas projecting the depth texture into the scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(68/255, 68/255, 76/255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let textureMatrix = m4.identity();
    textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
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

    drawScene(projectionMatrix, cameraMatrix, textureMatrix, lightWorldMatrix, textureProgramInfo);

    // ------ Draw the frustum ------
    {
      const viewMatrix = m4.inverse(cameraMatrix);

      gl.useProgram(colorProgramInfo.program);

      gl.bindVertexArray(cubeLinesVAO);

      const mat = m4.multiply(
          lightWorldMatrix, m4.inverse(lightProjectionMatrix));

      twgl.setUniforms(colorProgramInfo, {
        u_color: [1, 1, 1, 1],
        u_view: viewMatrix,
        u_projection: projectionMatrix,
        u_world: mat,
      });

      twgl.drawBufferInfo(gl, cubeLinesBufferInfo, gl.LINES);
    }

    if (currentSceneIndex == 0) {
      // Calculate the new posZ value based on the sine wave
      const amplitude = (7.7 - (-40)) / 2; // Half the distance between min and max
      const offset = (7.7 + (-40)) / 2;   // Midpoint of min and max
      settings.posZ = amplitude * Math.sin(time) + offset;
  
      // Increment the time variable to animate the wave
      time += frequency;
    }

    if (currentSceneIndex == 1){
      const amplitude = (30 - (-30)) / 2; // Half the distance between min and max
      const offset = (30 + (-30)) / 2;   // Midpoint of min and max
      settings.posZ = amplitude * Math.sin(time) + offset;
  
      // Increment the time variable to animate the wave
      time += frequency;
    }

    if (currentSceneIndex == 2){
      const amplitude = (30 - (-30)) / 2; // Half the distance between min and max
      const offset = (30 + (-30)) / 2;   // Midpoint of min and max
      settings.posZ = amplitude * Math.sin(time) + offset;
  
      // Increment the time variable to animate the wave
      time += frequency;
    }

    requestAnimationFrame(render);
  }

  render();
}

main();
