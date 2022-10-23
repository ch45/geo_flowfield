
let params = {};
params.scale = 25;
params.lineColor = 51;
params.backgroundColor = 220;
params.real = {data: null};
params.normalizedLinear = {data: [], extents: {x: 0, y: 0}};

function preload() {
  params.real.data = new GeoEnvData();
  // params.normalizedLinear.data = params.real.data.getLinearData(windowWidth / params.scale, windowHeight / params.scale)
}

function setup() {
  params.real.data.setupGeoEnvData();
  createCanvas(windowWidth, windowHeight);
  noStroke();
  // initParticles();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(params.backgroundColor);
  stroke(params.lineColor);
  let arr = getLinearData(floor(windowWidth / params.scale), floor(windowHeight / params.scale));
  let ind = 0;
  let half_scale = floor(params.scale / 2);
  for (let y = half_scale; y < windowHeight - half_scale; y += params.scale) {
    for (let x = half_scale; x < windowWidth - half_scale; x += params.scale) {
      // square(x - half_scale, y - half_scale, params.scale);
      // circle(x, y, params.scale);
      let val = arr[ind++]; // frameCount / 100;
      let v = p5.Vector.fromAngle(val * TWO_PI, half_scale);
      line(x, y, x + v.y, y - v.x); // contrive that 0deg is up on the page (north)
    }
  }
  //for (let i=0; i<particles.length; i++) {
  //  particles[i].run();
  // }
  let s = round(frameRate(),1)+" "+round(millis()/1000,1); // x+","+y+": "+
  text(s, 10, windowHeight - 30);
}

function getLinearData(little_x_lim, little_y_lim) {
  if (params.normalizedLinear.extents.x !== little_x_lim || params.normalizedLinear.extents.y !== little_y_lim) {
    let arr = params.real.data.getLinearData(little_x_lim, little_y_lim, 'PMS 1.0');
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
    params.normalizedLinear.extents.x = little_x_lim;
    params.normalizedLinear.extents.y = little_y_lim;
    params.normalizedLinear.data = arr;
  }
  return params.normalizedLinear.data;
}

function initParticles() {
  for (let i=0; i<num; i++) {
    //x value start slightly outside the right of canvas, z value how close to viewer
    let loc = createVector(random(width*1.2), random(height), 2);
    let angle = 0; //any value to initialize
    let dir = createVector(cos(angle), sin(angle));
    let speed = random(0.5,2);
    // let speed = random(5,map(mouseX,0,width,5,20));   // faster
    particles[i]= new Particle(loc, dir, speed);
  }
}

class Particle{
  constructor(_loc,_dir,_speed){
    this.loc = _loc;
    this.dir = _dir;
    this.speed = _speed;
  }
  run() {
    this.move();
    this.checkEdges();
    this.update();
  }
  move(){
    // TODO let angle=params.real.data.noise(this.loc.x/noiseScale, this.loc.y/noiseScale, frameCount/noiseScale)*TWO_PI*noiseStrength; //0-2PI
    this.dir.x = cos(angle);
    this.dir.y = sin(angle);
    let vel = this.dir.copy();
    let d = 1;  //direction change
    vel.mult(this.speed*d); //vel = vel * (speed*d)
    this.loc.add(vel); //loc = loc + vel
  }
  checkEdges(){
    //float distance = dist(width/2, height/2, loc.x, loc.y);
    //if (distance>150) {
    if (this.loc.x<0 || this.loc.x>width || this.loc.y<0 || this.loc.y>height) {
      this.loc.x = random(width*1.2);
      this.loc.y = random(height);
    }
  }
  update(){
    fill(255);
    // TODO draw line from previous point for plotter
    ellipse(this.loc.x, this.loc.y, this.loc.z);
  }
}
