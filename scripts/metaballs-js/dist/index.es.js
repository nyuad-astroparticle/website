function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var defaultOptions = {
  numMetaballs: 100,
  minRadius: 3,
  maxRadius: 7.5,
  speed: 10.0,
  color: '#ff0024',
  backgroundColor: '#121212',
  useDevicePixelRatio: true,
  interactive: false
};
function getOptions(passedOptions) {
  var mergedOptions = Object.keys(defaultOptions).reduce(function (acc, key) {
    return Object.assign(acc, _defineProperty({}, key, passedOptions[key] !== undefined ? passedOptions[key] : defaultOptions[key]));
  }, {});
  return mergedOptions;
}

var colorToVec4 = (function (color) {
  var isValid = /^#[0-9A-F]{6,8}$/i.test(color);

  if (!isValid) {
    throw new Error("".concat(color, " is not a valid hex color. Must be a 6 (8) character hex (+alpha) color."));
  }

  var hexChannels = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7), color.slice(7, 9)];
  var unitChannels = hexChannels.map(function (hex) {
    return Number.parseInt(hex, '16');
  }).map(function (val) {
    return val / 0xff;
  });
  if (!Number.isFinite(unitChannels[3])) unitChannels[3] = 1.0;
  return unitChannels;
});

function shaders(_ref) {
  var gl = _ref.gl,
      options = _ref.options;

  // Utility to fail loudly on shader compilation failure
  function compileShader(shaderSource, shaderType) {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error("Shader compile failed with: ".concat(gl.getShaderInfoLog(shader)));
    }

    return shader;
  }

  var vertexShader = compileShader("\nattribute vec2 position;\n\nvoid main() {\n    // position specifies only x and y.\n    // We set z to be 0.0, and w to be 1.0\n    gl_Position = vec4(position, 0.0, 1.0);\n}\n", gl.VERTEX_SHADER);
  var numMetaballs = options.numMetaballs + (options.interactive ? 1 : 0);
  var colorVec4 = colorToVec4(options.color);
  var backgroundColorVec4 = colorToVec4(options.backgroundColor);
  var fragmentShader = compileShader("\nprecision highp float;\nuniform vec2 windowSize;\nuniform vec3 metaballs[".concat(numMetaballs, "];\n\nvoid main(){\n    // scaling from [0,100] to [0, canvasWidth/Height]\n    float radiusMultiplier = min(windowSize.x, windowSize.y) / 200.0;\n    float xMultiplier = windowSize.x / 100.0;\n    float yMultiplier = windowSize.y / 100.0;\n\n    float x = gl_FragCoord.x;\n    float y = gl_FragCoord.y;\n    float v = 0.0;\n    for (int i = 0; i < ").concat(numMetaballs, "; i++) {\n        vec3 mb = metaballs[i];\n        float dx = abs((mb.x * xMultiplier) - x);\n        // width - dx is needed for the wrap-around-the-edges logic\n        dx = min(dx, windowSize.x - dx);\n        float dy = abs((mb.y * yMultiplier) - y);\n        // height - dy is needed for the wrap-around-the-edges logic\n        dy = min(dy, windowSize.y - dy);\n        float r = mb.z * radiusMultiplier;\n        v += r*r/(dx*dx + dy*dy);\n    }\n    if (v > 1.0) {\n        gl_FragColor = vec4(").concat(colorVec4.join(', '), ");\n    } else {\n        gl_FragColor = vec4(").concat(backgroundColorVec4.join(', '), ");\n    }\n}\n"), gl.FRAGMENT_SHADER);
  return {
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
  };
}

function geometry(_ref) {
  var gl = _ref.gl,
      program = _ref.program;
  // Set up 4 vertices, which we'll draw as a rectangle
  // via 2 triangles
  //
  //   A---C
  //   |  /|
  //   | / |
  //   |/  |
  //   B---D
  //
  // We order them like so, so that when we draw with
  // gl.TRIANGLE_STRIP, we draw triangle ABC and BCD.
  var vertexData = new Float32Array([-1.0, 1.0, // top left
  -1.0, -1.0, // bottom left
  1.0, 1.0, // top right
  1.0, -1.0 // bottom right
  ]);
  var vertexDataBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  /**
   * Attribute setup
   */
  // Utility to complain loudly if we fail to find the attribute

  function getAttribLocation(program, name) {
    var attributeLocation = gl.getAttribLocation(program, name);

    if (attributeLocation === -1) {
      throw new Error("Can not find attribute ".concat(name, "."));
    }

    return attributeLocation;
  } // To make the geometry information available in the shader as attributes, we
  // need to tell WebGL what the layout of our data in the vertex buffer is.


  var positionHandle = getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionHandle);
  gl.vertexAttribPointer(positionHandle, 2, // position is a vec2
  gl.FLOAT, // each component is a float
  gl.FALSE, // don't normalize values
  2 * 4, // two 4 byte float components per vertex
  0 // offset into each span of vertex data
  );
}

// Utility to complain loudly if we fail to find the uniform
function getUniformLocation(_ref) {
  var gl = _ref.gl,
      program = _ref.program,
      name = _ref.name;
  var uniformLocation = gl.getUniformLocation(program, name);

  if (uniformLocation === -1) {
    throw new Error("Can not find uniform ".concat(name, "."));
  }

  return uniformLocation;
}

var createMetaballs = function createMetaballs(_ref) {
  var options = _ref.options;
  return Array.from({
    length: options.numMetaballs + (options.interactive ? 1 : 0)
  }, function () {
    var radius = options.minRadius + Math.random() * (options.maxRadius - options.minRadius);
    return {
      x: Math.random() * (100 - radius / 100) + radius / 200,
      y: Math.random() * (100 - radius / 100) + radius / 200,
      vx: (Math.random() - 0.5) * 2 * options.speed / 100,
      vy: (Math.random() - 0.5) * 2 * options.speed / 100,
      r: radius
    };
  });
};

var simulateMovement = function simulateMovement(_ref2) {
  var metaballs = _ref2.metaballs,
      options = _ref2.options;
  // don't move last interactive cursor metaball
  if (options.interactive) metaballs = metaballs.slice(0, -1);
  metaballs.forEach(function (mb) {
    mb.x += mb.vx;

    if (mb.x < 0) {
      mb.x = 100 - mb.x;
    } else if (mb.x > 100) {
      mb.x = mb.x - 100;
    }

    mb.y += mb.vy;

    if (mb.y < 0) {
      mb.y = 100 - mb.y;
    } else if (mb.y > 100) {
      mb.y = mb.y - 100;
    }
  });
};

var getMetaballsHandle = function getMetaballsHandle(_ref3) {
  var gl = _ref3.gl,
      program = _ref3.program;
  var metaballsHandle = getUniformLocation({
    gl: gl,
    program: program,
    name: 'metaballs'
  });
  return metaballsHandle;
};

function initInteractive(_ref) {
  var options = _ref.options,
      gl = _ref.gl;
  var interactive = options.interactive;

  if (interactive && !["window", "canvas"].includes(interactive)) {
    throw new Error("options.interactive must be one of \"false\", \"'window'\", or \"'canvas'\". Provided \"".concat(interactive, "\" (").concat(_typeof(interactive), ")."));
  }

  var cursorPos = {
    x: 0,
    y: 0
  };

  function cursorMoveCanvas(e) {
    cursorPos.x = (e.offsetX || e.clientX) / gl.canvas.clientWidth;
    cursorPos.y = (e.offsetY || e.clientY) / gl.canvas.clientHeight;
    cursorPos.x = cursorPos.x * 100;
    cursorPos.y = (1 - cursorPos.y) * 100;
  }

  function cursorMoveWindow(e) {
    cursorPos.x = e.clientX / gl.canvas.clientWidth;
    cursorPos.y = e.clientY / gl.canvas.clientHeight;
    cursorPos.x = cursorPos.x * 100;
    cursorPos.y = (1 - cursorPos.y) * 100;
  }

  var cursorMove = function cursorMove() {
    return null;
  };

  var unsubscribe = function unsubscribe() {
    return null;
  };

  if (interactive) {
    if (interactive === "window") {
      cursorMove = cursorMoveWindow;
      window.addEventListener('mousemove', cursorMove);

      unsubscribe = function unsubscribe() {
        return window.removeEventListener('mousemove', cursorMove);
      };
    } else if (interactive === "canvas") {
      cursorMove = cursorMoveCanvas;
      gl.canvas.addEventListener('mousemove', cursorMove);

      unsubscribe = function unsubscribe() {
        return gl.canvas.removeEventListener('mousemove', cursorMove);
      };
    }
  }

  return {
    cursorPos: cursorPos,
    unsubscribe: unsubscribe
  };
}

function initMetaballs(canvas) {
  var passedOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var options = getOptions(passedOptions);

  if (typeof canvas === 'string') {
    canvas = document.querySelector(canvas);
  }

  if (!(canvas instanceof window.Element) || canvas.tagName.toLowerCase() !== 'canvas') {
    throw new Error("First argument of \"initMetaballs\" must be a valid canvas element or a selector to an existing canvas element.");
  }
  /**
   * Shaders setup
   */


  var gl = canvas.getContext('webgl');

  var _shaders = shaders({
    gl: gl,
    options: options
  }),
      vertexShader = _shaders.vertexShader,
      fragmentShader = _shaders.fragmentShader;

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);
  /**
   * Canvas & Metaballs setup
   */

  geometry({
    gl: gl,
    program: program
  }); // resize handler

  var resize = function resize() {
    var realToCSSPixels = options.useDevicePixelRatio ? window.devicePixelRatio : 1; // Lookup the size the browser is displaying the canvas in CSS pixels
    // and compute a size needed to make our drawingbuffer match it in
    // device pixels.

    var displayWidth = Math.floor(gl.canvas.clientWidth * realToCSSPixels);
    var displayHeight = Math.floor(gl.canvas.clientHeight * realToCSSPixels); // Check if the canvas is not the same size.

    if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
      // Make the canvas the same size
      gl.canvas.width = displayWidth;
      gl.canvas.height = displayHeight;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
  }; // user might now have set correct canvasWidth / canvasHeight


  resize();
  var metaballs = createMetaballs({
    options: options
  });
  var metaballsHandle = getMetaballsHandle({
    gl: gl,
    program: program
  }); // get windowSize uniform

  var windowSizeHandle = getUniformLocation({
    gl: gl,
    program: program,
    name: 'windowSize'
  });
  /**
   * Simulation step, data transfer, and drawing
   */

  var _initInteractive = initInteractive({
    options: options,
    gl: gl
  }),
      cursorPos = _initInteractive.cursorPos,
      unsubscribeInteractive = _initInteractive.unsubscribe;

  var run = true;

  var step = function step() {
    var canvasWidth = gl.canvas.width;
    var canvasHeight = gl.canvas.height; // Update positions and speeds

    simulateMovement({
      metaballs: metaballs,
      options: options
    }); // To send the data to the GPU, we first need to
    // flatten our data into a single array.

    var dataToSendToGPU = new Float32Array(3 * metaballs.length);
    metaballs.forEach(function (mb, i) {
      var baseIndex = 3 * i;
      dataToSendToGPU[baseIndex + 0] = mb.x;
      dataToSendToGPU[baseIndex + 1] = mb.y;
      dataToSendToGPU[baseIndex + 2] = mb.r;
    });

    if (options.interactive) {
      // overwrite last metaball's position with cursor
      var baseIndex = 3 * (metaballs.length - 1);
      dataToSendToGPU[baseIndex + 0] = cursorPos.x;
      dataToSendToGPU[baseIndex + 1] = cursorPos.y;
      dataToSendToGPU[baseIndex + 2] = options.maxRadius;
    }

    gl.uniform3fv(metaballsHandle, dataToSendToGPU);
    gl.uniform2fv(windowSizeHandle, Float32Array.from({
      length: 2
    }, function (_, index) {
      return index === 0 ? canvasWidth : canvasHeight;
    }));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (run) window.requestAnimationFrame(step);
  };

  step();
  window.addEventListener('resize', resize);

  var destroy = function destroy() {
    run = false;
    window.removeEventListener('resize', resize);
    unsubscribeInteractive();
  };

  return destroy;
}

export default initMetaballs;
//# sourceMappingURL=index.es.js.map
