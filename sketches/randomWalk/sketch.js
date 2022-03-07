let fab;

// Random Walk Variables
let path = [];
let minX = 10000;
let minY = 10000;
let maxX = -1000;
let maxY = -1000;
let centerX = 0;
let centerY = 0;   
let k = 50; // scale factor
// sound data variables
let soundData = [];

function preload() {
  //my table is comma separated value "csv"
  //and has a header specifying the columns labels

  // let f = 'assets/mic-data.csv';
  let f = 'assets/analog-vibe-data.csv';
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
  fab.moveRetract(1, 1, 5); // pop up to avoid collisions
                         
  let discCenter = new p5.Vector(100, 100);
  let radius = 50;
  let z = 3.3;
  let s = 15;

  // draw a circumscribing circle, if we need it
  for (let angle = 0; angle < TWO_PI; angle += TWO_PI/100) {
    let x = radius * cos(angle);
    let y = radius * sin(angle);
    (angle == 0) ? fab.moveRetract(x + discCenter.x, y + discCenter.y, z): fab.moveExtrude(x + discCenter.x, y + discCenter.y, z, s);
  }



  let discHeight = 1;
  let layerHeight = 0.2;

  let currentX = 0;
  let currentY = 0;
  // fab.moveRetract(currentX, currentY, 0.2);
  let dir = 'r';
  let pos = true;

  for (let i = 0; i < soundData.length; i += 1){
    let data = soundData[i];
    data -= 70; // assuming 70 is center of data- will need to compute this value
    if (data >= 0){
      pos = true;
    }
    else {
      pos = false;
    }



    switch (dir){
      case 'r':
        print('right');
        if (pos) {
          // turn right on positive aka move down
          currentY -= k*data;
          walk(currentX, currentY);
          // fab.moveExtrude(currentX, currentY);
          dir = 'd';
        }
        else {
          // turn left aka move up
          currentY += k*data;
          walk(currentX, currentY);
          // fab.moveExtrude(currentX, currentY);
          dir = 'u';
        }
        break;
      
      case 'l':
        print('left');
        if (pos) {
          // turn right aka move up
          currentY += k*data;
          walk(currentX, currentY);
          // fab.moveExtrude(currentX, currentY);
          dir = 'u';
        }
        else {
          // turn left aka move down
          currentY -= k*data;
          walk(currentX, currentY);
          // fab.moveExtrude(currentX, currentY);
          dir = 'd';
        }
        break;
      
      case 'u':
        print('up');
        if (pos) {
          // turn right aka move right
          currentX += k*data;
          walk(currentX, currentY);
          // fab.moveExtrude(currentX, currentY);
          dir = 'r';
        }
        else {
          // turn left aka move left
          currentX -= k*data;
          walk(currentX, currentY);
          // fab.moveExtrude(currentX, currentY);
          dir = 'l';
        }
        break;

      case 'd':
        print('down');
        if (pos) {
          // turn right aka move left
          currentX -= k*data;
          walk(currentX, currentY);
          // fab.moveExtrude(currentX, currentY);
          dir = 'l';
        }
        else {
          // turn left aka move right
          currentX += k*data;
          walk(currentX, currentY);
          // fab.moveExtrude(currentX, currentY);
          dir = 'r';
        }
        break;
    }

    
  }
  // now that we have the path, map it to a disk
  for (let i = 0; i < path.length; i++) {
    let [xc, yc] = mapToCircle(path[i].x, path[i].y);
    if (i == 0) {
      fab.moveRetract(xc, yc, z);
    }
    else {
      fab.moveExtrude(xc, yc, z, s); 
    }
    if (xc < 10) {
      print('low xc: ' + xc);
    }
    
  }


  fab.presentPart();
}
function draw() {
  orbitControl(2, 2, 0.1);
  background(255);
  fab.render();
}

function walk(x, y) {
  path.push(createVector(x, y));

  if (x < minX) {
    minX = x;
  }
  else if (x > maxX) {
    maxX = x;
  }

  if (y < minY) {
    minY = y;
  }
  else if (y > maxY){
    maxY = y;
  }
}


function mapToCircle(x, y) {
  let x_ = map(x, minX, maxX, -1, 1);
  let y_ = map(y, minY, maxY, -1, 1);
  let xc = x_ * sqrt(1 - (y_**2)/2);
  let yc = y_ * sqrt(1 - (x_**2)/2);
  if (xc > 1){
    xc = 1;
  }
  else if (xc < -1){
    xc = -1;
  }

  if (yc > 1){
    yc = 1;
  }
  else if (yc < -1){
    yc = -1;
  }
  xc = map(constrain(xc, -1, 1), -1, 1, 50, 150);
  yc = map(constrain(yc, -1, 1), -1, 1, 50, 150);
  if (xc > 150 || xc < 50)  {
    print('outside!');
  }
  else if (yc > 150 || yc < 50)  {
    print('outside!');
  }

  return [xc, yc];
}