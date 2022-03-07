let fab;

// Hilbert Curve Variables
const order = 4;
let N;
let total;
let hLength = 50; //mm
let path = [];
let centerX = 75;
let centerY = 75;   

// sound data variables
let soundData = [];

function preload() {
  //my table is comma separated value "csv"
  //and has a header specifying the columns labels

  let f = 'assets/mic-data.csv';
  // let f = 'assets/digital-vibe-data.csv';
  table = loadTable(f, 'csv', 'header');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);

    // p5.fab setup
    fab = createFab();
  
    let connectButton = createButton('connect!');
    connectButton.position(20, 20);
    connectButton.mousePressed(function() {
      fab.serial.requestPort(); // choose the serial port to connect to
    });

    let printButton = createButton('print!');
    printButton.position(20, 60);
    printButton.mousePressed(function() {
      fab.print(); // start streaming the commands to printer
    });

    let stopButton = createButton('stop!');
    stopButton.position(20, 100);
    stopButton.mousePressed(function() {
      fab.stopPrint(); // stop streaming the commands to printer.
    });

    // Hilbert Curve Setup
    N = int(pow(2, order));
    total = N * N;

    for (let i = 0; i < total; i++) {
      path[i] = hilbert(i);
      let len = hLength / N;
      path[i].mult(len);
      path[i].add(len / 2, len / 2);
    }

    // Sounda Data Setup
    print(table.getRowCount() + ' total rows in table');

    for (let r = 0; r < table.getRowCount(); r++)
      for (let c = 0; c < 1; c++) { // only have 1 column rn but could have more
        soundData.push(table.getString(r, c));
    }

}


function fabDraw() {
  // setup!
  fab.setAbsolutePosition(); // set the coordinate system mode
  fab.setERelative(); // it's easier to work with the extruder axis in relative positioning
  fab.setTemps(205, 60);
  fab.autoHome();

  fab.introLine();
                         
  let discCenter = new p5.Vector(centerX + hLength/2, centerY + hLength/2);

  // // draw a circumscribing circle, if we need it
  // for (let angle = 0; angle < TWO_PI; angle += TWO_PI/100) {
  //   let x = hLength/2 * cos(angle);
  //   let y = hLength/2 * sin(angle);
  //   print(x + discCenter.x);
  //   (angle == 0) ? fab.moveRetract(x + discCenter.x, y + discCenter.y, 0.2): fab.moveExtrude(x + discCenter.x, y + discCenter.y, 0.2);
  // }


  let s = 15;
  let discHeight = .2;
  let layerHeight = 0.2;
  let dataSpacing = 0.5; // 1 mm between each data point
  let dataCounter = 0; // get a data point
  let offsetAmplitude = 5;
  let dataOffset;
  for (let h = 0.2; h <= discHeight; h += layerHeight) {
    fab.moveRetract(path[2].x, path[2].y, h);
    // dataCounter = 0; // add this if we want to print same data every layer
    for (let i = 1; i < path.length; i++) {
      let dir = checkDirection(path[i-1], path[i]); // check if the curve is moving up/left/right/down to offset data correctly
      // subdivide the segment to offset curve by sound data 
      switch (dir) {
        case 'r':
          for (let x = path[i-1].x; x <= path[i].x; x += dataSpacing) {
            x != path[i-1].x ? dataOffset = soundData[dataCounter] : dataOffset = 0; // don't offset first point
            dataOffset = constrain(map(dataOffset, 300, 400, 0, offsetAmplitude), 0, offsetAmplitude);
            let [xc, yc] = mapSquareToCircle(x, path[i].y + dataOffset);
            fab.moveExtrude(xc, yc, h, s);

            dataCounter = incrementDataCounter(dataCounter);
          }

        case 'l':
          for (let x = path[i-1].x; x >= path[i].x; x -= dataSpacing) {
            x != path[i-1].x ? dataOffset = soundData[dataCounter] : dataOffset = 0;
            dataOffset = constrain(map(dataOffset, 300, 400, 0, offsetAmplitude), 0, offsetAmplitude);
            let [xc, yc] = mapSquareToCircle(x, path[i].y - dataOffset);
            fab.moveExtrude(xc, yc, h, s);

            dataCounter = incrementDataCounter(dataCounter);
          }

        case 'u':
          for (let y = path[i-1].y; y <= path[i].y; y += dataSpacing) {
            y != path[i-1].y ? dataOffset = soundData[dataCounter] : dataOffset = 0;
            dataOffset = constrain(map(dataOffset, 300, 400, 0, 5), offsetAmplitude, offsetAmplitude);
            let [xc, yc] = mapSquareToCircle(path[i].x + dataOffset, y);
            fab.moveExtrude(xc, yc, h, s);

            dataCounter = incrementDataCounter(dataCounter);
          }

          case 'd':
            for (let y = path[i-1].y; y >= path[i].y; y -= dataSpacing) {
              y != path[i-1].y ? dataOffset = soundData[dataCounter] : dataOffset = 0;
              dataOffset = constrain(map(dataOffset, 300, 400, 0, offsetAmplitude), 0, offsetAmplitude);
              let [xc, yc] = mapSquareToCircle(path[i].x - dataOffset, y);
              fab.moveExtrude(xc, yc, h, s);

              dataCounter = incrementDataCounter(dataCounter);
            }
      }
      // subdivision might not perfectly get to the end of the line segment: move there explicitly
      let [xc, yc] = mapSquareToCircle(path[i].x, path[i].y);
      fab.moveExtrude(xc, yc, h);
    }
  }

  fab.presentPart();
}
function draw() {
  orbitControl(2, 2, 0.1);
  background(255);
  fab.render();
}

function hilbert(i) {
  const points = [
    new p5.Vector(0, 0),
    new p5.Vector(0, 1),
    new p5.Vector(1, 1),
    new p5.Vector(1, 0)
  ];

  let index = i & 3;
  let v = points[index];

  for (let j = 1; j < order; j++) {
    i = i >>> 2;
    index = i & 3;
    let len = pow(2, j);
    if (index == 0) {
      let temp = v.x;
      v.x = v.y;
      v.y = temp;
    } else if (index == 1) {
      v.y += len;
    } else if (index == 2) {
      v.x += len;
      v.y += len;
    } else if (index == 3) {
      let temp = len - 1 - v.x;
      v.x = len - 1 - v.y;
      v.y = temp;
      v.x += len;
    }
  }
  return v;
}

function checkDirection(prev, cur) {
  if (prev.x < cur.x) {
    // moving to the right
    return 'r';
  }
  else if (prev.x > cur.x) {
    // left
    return 'l';
  }
  else if (prev.y < cur.y) {
    // up
    return 'u';
  }
  else {
    // down
    return 'd';
  }
}

function getLine(x, y) {
  // the previous position is stored in fab.x, fab.y
  let m = (y - fab.y) / (x - fab.x);
  let b = y - m * x;
  return [m, b];
}

function mapSquareToCircle(x, y) {
  let x_ = map(x + centerX, centerX, centerX + hLength-1, -1, 1);
  if (x_ > 0.95){
    print(x_);
  }
  let y_ = map(y + centerY, centerY, centerY + hLength - 1, -1, 1);
  let xc = x_ * sqrt(1 - (y_**2)/2);
  let yc = y_ * sqrt(1 - (x_**2)/2);
  xc = map(xc, -1, 1, centerX, centerX + hLength);
  yc = map(yc, -1, 1, centerY, centerY + hLength);

  return [xc, yc];
}

function incrementDataCounter(c) {
  // we might not have enough data points 
  // so reset when we get to the end
  c += 1;
  if (c >= soundData.length) {
    c = 0;
  }

  return c;
}



// old code to just draw the curve without subdividing
// hilbert curve fills a plane (i.e. square) by default
    // need to map a square to a circle
    // see http://mathproofs.blogspot.com/2005/07/mapping-square-to-circle.html for equations
    
    // let x = map(path[i].x + centerX, centerX, centerX + hLength, -1, 1);
    // let y = map(path[i].y + centerY, centerY, centerY + hLength, -1, 1);
    // let xc = x * sqrt(1 - (y**2)/2);
    // let yc = y * sqrt(1 - (x**2)/2);
    // x = map(xc, -1, 1, centerX, centerX + hLength);
    // y = map(yc, -1, 1, centerY, centerY + hLength);

    // if (i == 1) {
    //   fab.moveRetract(x, y, 0.2); // retract to start position
    // }
    // else {
    //   // subdivide the current linear move command to offset curve by sound data
    //   let [m, b] = getLine(x, y);
      
    //   print('fab.x: ' + fab.x);
    //   print('x to get to: ' + x);
    //   for (let lx = fab.x; lx < x; lx += 0.1) {
    //     let ly = m*lx + b;
    //     fab.moveExtrude(lx, ly, 0.2, s); // retract to start position);
    //   }

    //   fab.moveExtrude(x, y, 0.2, s); 
    // }

    // (i == 1) ? fab.moveRetract(x, y, 0.2, s) : fab.moveExtrude(x, y, 0.2, s);    