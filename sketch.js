
let params = {};
params.scale = 30;
params.lineColor = 51;
params.backgroundColor = 220;
params.real = {data: null};
params.normalizedBucket = {data: [], extents: {x: 0, y: 0}};
params.particles = {objects: [], max: 200, color: 102};

function preload() {
  params.real.data = new GeoEnvData();
  // params.normalizedBucket.data = params.real.data.getBucketData(windowWidth / params.scale, windowHeight / params.scale)
}

function setup() {
  params.real.data.setupGeoEnvData();
  createCanvas(windowWidth, windowHeight);
  noStroke();
  initParticles();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(params.backgroundColor);
  stroke(params.lineColor);
  let arr = getBucketData(floor(windowWidth / params.scale), floor(windowHeight / params.scale));
  let ind = 0;
  let half_scale = floor(params.scale / 2);
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
  for (let i = 0; i < params.particles.max; i++) {
    params.particles.objects[i].run();
  }
  let s = round(frameRate(),1)+" "+round(millis()/1000,1); // x+","+y+": "+
  text(s, 10, windowHeight - 30);
}

function getBucketData(little_x_lim, little_y_lim) {
  if (params.normalizedBucket.extents.x !== little_x_lim || params.normalizedBucket.extents.y !== little_y_lim) {
    let arr = params.real.data.getBucketData(little_x_lim, little_y_lim, 'PMS 1.0');
    // let arr = [];
    // let ind = 0;
    // let num = 0;
    // for (let y = 0; y < little_y_lim; y++) {
    //   for (let x = 0; x < little_x_lim; x++) {
    //     if (num >= 1) {
    //       num = 0;
    //     }
    //     arr[ind++] = num;
    //     num += 0.005;
    //   }
    // }
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
  let loc = createVector(random(windowWidth), random(windowHeight));
  let angle = random(TWO_PI);
  let acc = createVector(sin(angle), -cos(angle));
  let dir = acc.copy().mult(random(0.2,1));
  acc.mult(1/50);
  return new Particle(loc, dir, acc);
}

function getValueFromBucket(x, y) {
  x /= params.scale;
  y /= params.scale;
  if (x < 0 || x >= params.normalizedBucket.extents.x || y < 0 || y >= params.normalizedBucket.extents.y) {
    return null;
  }
  return params.normalizedBucket.data[floor(y) * params.normalizedBucket.extents.x + floor(x)];
}

class Particle{
  // Vector, Vector, Vector
  constructor(loc, dir, acc){
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
    // TODO look at params.normalizedBucket.extents
    let val = getValueFromBucket(this.loc.x, this.loc.y);
    // print(val);
    if (val !== null) {
      let angle = val * TWO_PI;
      let acc = createVector(sin(angle), -cos(angle));
      this.acc.add(acc.mult(this.acc.mag() * 3 / 100));
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
      this.loc = newParticle.loc;
      this.dir = newParticle.dir;
      this.acc = newParticle.acc;
    }
  }
  update() {
    fill(params.particles.color);
    // TODO draw line from previous point for plotter
    ellipse(this.loc.x, this.loc.y, 10);
  }
}
