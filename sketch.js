
let params = {};
params.scale = 30;
params.lineColor = 51;
params.backgroundColor = 220;
params.alpha = 10;
params.real = {data: null};
params.normalizedBucket = {data: [], extents: {x: 0, y: 0}};
params.particles = {objects: [], nextId: 0, max: 200, color: 102, width: 10};
params.saveSVG = {pg: null, vectorPath: [], mode: 0, startExtentId: 0};
params.throttle = 1; // >=1
params.KeyS = 83; // the S key - to save flowfield as an SVG while depressed
params.canvas = null;

function preload() {
  params.real.data = new GeoEnvData();
  // params.normalizedBucket.data = params.real.data.getBucketData(windowWidth / params.scale, windowHeight / params.scale)
}

function setup() {
  params.real.data.setupGeoEnvData();
  params.canvas = createCanvas(windowWidth, windowHeight);
  noStroke();
  initParticles();
  background(params.backgroundColor);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(params.backgroundColor);
}

function draw() {
  if (checkDrawingSVG()) {
    drawSVGVectorPath();
  } else {
    fill(params.backgroundColor, params.alpha);
    rect(0, 0, windowWidth-1, windowHeight-1);
    drawScreenFlowGuides();
    for (let i = frameCount % params.throttle; i < params.particles.max; i += 1 + (frameCount % params.throttle)) {
      params.particles.objects[i].run();
    }
    if (params.saveSVG.mode === 0) {
      drawScreenMsg(round(frameRate(),1)+" "+round(millis()/1000,1));
    }
  }
}

function checkDrawingSVG() {
  // print("save SVG mode " + params.saveSVG.mode);
  if (keyIsDown(params.KeyS)) {
    switch (params.saveSVG.mode) {
      case 0:
        params.saveSVG.mode = 1; // cycle for a de-bounce
        return false;
      case 1: // de-bounce pass
      case 3: // de-bounce return
        params.saveSVG.mode = 2; // collecting data
        params.saveSVG.startExtentId = 0;
        return false;
      case 2: // collecting data
        copyParticleLocationsToVectors();
        drawScreenMsg("Collecting Paths " + getNumberVectors());
        return false;
      default:
        return false;
      }
  } else {
    switch (params.saveSVG.mode) {
      case 0:
        return false; // normal raster render
      case 1:  
        params.saveSVG.mode = 0; // revert de-bounce
        return false;
      case 2:
        params.saveSVG.mode = 3; // cycle for a de-bounce
        return false;
      case 3: 
        params.saveSVG.mode = 4; // switch to SVG drawing
        params.canvas = createCanvas(windowWidth, windowHeight, SVG);
        return true;
      // case 4: 
      //   somewhere else progress from mode 4
      case 4:
        return true;
      case 5:
        params.saveSVG.mode = 0; // reset
        save();
        params.canvas = createCanvas(windowWidth, windowHeight);
        return false;
    }
  }
}

function drawScreenFlowGuides() {
  let arr = getBucketData(floor(windowWidth / params.scale), floor(windowHeight / params.scale));
  if (frameCount > 600) {
    return;
  }
  let ind = 0;
  let half_scale = floor(params.scale / 2);
  stroke(params.lineColor);
  for (let y = half_scale; y < windowHeight - half_scale; y += params.scale) {
    for (let x = half_scale; x < windowWidth - half_scale; x += params.scale) {
      // fill(params.backgroundColor)
      // square(x - half_scale, y - half_scale, params.scale);
      // circle(x, y, params.scale);
      let val = arr[ind++]; // frameCount / 100;
      let v = p5.Vector.fromAngle(val * TWO_PI, half_scale);
      line(x, y, x + v.y, y - v.x); // contrive that 0deg is up on the page (north)
    }
  }
}

function drawScreenMsg(txt) {
  fill(params.backgroundColor);
  rect(8, windowHeight - 42, textWidth(txt) + 4, 14);
  fill(params.lineColor);
  text(txt, 10, windowHeight - 30);
}

function getBucketData(little_x_lim, little_y_lim) {
  if (params.normalizedBucket.extents.x !== little_x_lim || params.normalizedBucket.extents.y !== little_y_lim) {
    // let arr = getTestRotatingBucketData(little_x_lim, little_y_lim);
    let arr = params.real.data.getBucketData(little_x_lim, little_y_lim);
    params.normalizedBucket.extents.x = little_x_lim;
    params.normalizedBucket.extents.y = little_y_lim;
    params.normalizedBucket.data = arr;
  }
  return params.normalizedBucket.data;
}

function initParticles() {
  for (let i = 0; i < params.particles.max; i++) {
    params.particles.objects[i] = generateParticle();
  }
}

function generateParticle() {
  let id = params.particles.nextId++;
  // print(id);
  let loc = createVector(random(windowWidth), random(windowHeight));
  let angle = random(TWO_PI);
  let acc = createVector(sin(angle), -cos(angle));
  let dir = acc.copy().mult(random(0.2,1));
  acc.mult(1/50);
  return new Particle(id, loc, dir, acc);
}

function getValueFromBucket(x, y) {
  x /= params.scale;
  y /= params.scale;
  if (x < 0 || x >= params.normalizedBucket.extents.x || y < 0 || y >= params.normalizedBucket.extents.y) {
    return null;
  }
  return params.normalizedBucket.data[floor(y) * params.normalizedBucket.extents.x + floor(x)];
}

function getTestRotatingBucketData(little_x_lim, little_y_lim) {
  print(little_x_lim + "," + little_y_lim);
  let arr = [];
  let ind = 0;
  let num = 0;
  for (let y = 0; y < little_y_lim; y++) {
    for (let x = 0; x < little_x_lim; x++) {
      if (num >= 1) {
        num = 0;
      }
      arr[ind++] = num;
      num += 1 / 400;
    }
  }
  return arr;
}

function copyParticleLocationsToVectors() {
  for (let i = frameCount % params.throttle; i < params.particles.max; i += 1 + (frameCount % params.throttle)) {
    let id = params.particles.objects[i].id;
    let loc = params.particles.objects[i].loc;
    if (!params.saveSVG.vectorPath[id]) {
      params.saveSVG.vectorPath[id] = [];
    }
    params.saveSVG.vectorPath[id].push(createVector(loc.x, loc.y));
  }
}

function getNumberVectors () {
  let curEnd = params.particles.nextId - 1;
  if (params.saveSVG.startExtentId === 0) {
    params.saveSVG.startExtentId = curEnd;
  }
  return params.particles.max + curEnd - params.saveSVG.startExtentId;
}

function drawSVGVectorPath () {
  if (params.saveSVG.vectorPath.length > 0) {
    let path = params.saveSVG.vectorPath.splice(0, 1);
    if (path && path.length > 0 && path[0] && path[0].length > 0) {
      noFill();
      beginShape();
      for (let k = 0; k < path[0].length; k++) {
        let loc = path[0][k];
        let x = round(loc.x, 3);
        if (isNaN(x)) {
          x = loc.x;
        }
        let y = round(loc.y, 3);
        if (isNaN(y)) {
          y = loc.y;
        }
        vertex(x, y);
      }
      endShape();
    }
  } else {
    drawScreenMsg(geoEnvData.readings.join());
    params.saveSVG.mode = 5; // save the SVG
  }
}

class Particle{
  // Vector, Vector, Vector
  constructor(id, loc, dir, acc) {
    this.id = id;
    this.loc = loc;
    this.dir = dir;
    this.acc = acc;
  }
  run() {
    this.move();
    this.checkEdges();
    this.update();
  }
  move() {
    let val = getValueFromBucket(this.loc.x, this.loc.y);
    if (val !== null) {
      let angle = val * TWO_PI;
      let acc = createVector(sin(angle), -cos(angle));
      this.acc.add(acc.mult(this.acc.mag() * 8 / 100));
      this.acc.mult(99/100);
      this.dir.add(this.acc);
    }
    this.loc.add(this.dir);
  }
  checkEdges() {
    // print("checkEdges test="+(this.loc.x<0 || this.loc.x>windowWidth || this.loc.y<0 || this.loc.y>windowHeight));
    //float distance = dist(width/2, height/2, loc.x, loc.y);
    //if (distance>150) {
    if (this.loc.x<0 || this.loc.x>windowWidth || this.loc.y<0 || this.loc.y>windowHeight) {
      let newParticle = generateParticle();
      this.id = newParticle.id;
      this.loc = newParticle.loc;
      this.dir = newParticle.dir;
      this.acc = newParticle.acc;
    }
  }
  update() {
    fill(params.particles.color);
    noStroke();
    // TODO draw line from previous point for plotter
    ellipse(this.loc.x, this.loc.y, params.particles.width);
  }
}
