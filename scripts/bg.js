import initMetaballs from "./metaballs-js/dist/index.es.js";

const options = {
  numMetaballs: 20,
  minRadius: 18,
  maxRadius: 18,
  speed: 15.0,
  color: '#000000',
  backgroundColor: '#57068c',
  useDevicePixelRatio: true,
  interactive: 'window'
}

const cssSelector = '#metaballs'
initMetaballs(cssSelector, options)