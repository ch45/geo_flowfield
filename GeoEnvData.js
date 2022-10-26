
// Latitude,Heading,Longitude,Heading,Time,GPS Altitude,GPS Altitude Units,PMS 1.0,PMS 2.5,PMS 10.0,Gas ADC,Gas Oxidizing,Gas Reducing,Gas NH3,Noise Low,Noise Mid,Noise High,Noise Total,Temperature,Humidity,Pressure,Altitude,Lux,Proximity']

class GeoEnvData {
  noise(x, y, z) {
    return this.axis1(x);
  }
  // TODO complete this
  random(min, max) {
    return 0.5; // TODO 
  }
  setupGeoEnvData() {
    print("setupGeoEnvData");
    convertLatLong(this.tbl);
    this.columnExtents = getExtents(this.tbl);
    print(this.columnExtents);
  }
  getBucketData(little_x_lim, little_y_lim, valColName) {
    let arr = [];
    let valCol = colFromName(this.tbl, valColName);
    print(valColName + ',' + valCol);
    let numRows = this.tbl.getRowCount();
    let index = 0;
    for (let y = 0; y < little_y_lim; y++) {
      let x_start = 0;
      let x_end = little_x_lim - 1;
      let x_inc = 1;
      if (y % 2 !== 0) {
        x_end = 0;
        x_start = little_x_lim - 1;
        x_inc = -1;
      }
      for (let x = x_start; (x_inc > 0) ? x <= x_end :  x >= x_end; x += x_inc) {
        let colVal = Number(this.tbl.get(index, valCol));
        if (isNaN(colVal)) {
          colVal = 0;
        }
        let val = map(colVal, this.columnExtents[valCol].least, this.columnExtents[valCol].greatest, 0, 1);
        arr[y * little_x_lim + x] = val;
        index++;
        if (index > numRows) {
          index = 0;
        }
      }
    }
    return arr;
  }
  axis1(x) {
    let r = Math.round(map(Math.abs(x) % 1, 0, 1, 0, this.tbl.getRowCount()-1));
    let valCol = colFromName(this.tbl, "Latitude");
    let val = Number(this.tbl.get(r, valCol));
    if (isNaN(val)) {
      val = 0;
    }
    return map(val, this.columnExtents[valCol].least, this.columnExtents[valCol].greatest, 0, 1);
  }
  constructor(csvData) {
    print("GeoEnvData CONSTUCT");
    if (typeof csvData === 'undefined') {
      csvData = geoEnvData.srcUrl;
    }
    this.tbl = loadTable(csvData, 'csv', 'header');
  }
}

function convertLatLong(tbl) {
  let valCol = colFromName(tbl, "Latitude");
  let hemiCol = valCol + 1;
  let longCol = colFromName(tbl, "Longitude");
  let sideCol = longCol + 1;
  let numRows = tbl.getRowCount();

  // Convert valid locations
  for (let r = 0; r < numRows; r++) {
    let ptLat = tbl.getString(r, valCol);
    let ptHemi = tbl.getString(r, hemiCol);
    let ptLong = tbl.getString(r, longCol);
    let ptSide = tbl.getString(r, sideCol);
    if (ptLat !== "" && ptLong !== "") {
      let convertedLat = Math.floor(ptLat/100) + Math.floor(ptLat % 100)/60 + (ptLat-Math.floor(ptLat))*60/3600;
      if (ptHemi === "S") {
        convertedLat = -convertedLat;
      }
      let convertedLong = Math.floor(ptLong/100) + Math.floor(ptLong % 100)/60 + (ptLong-Math.floor(ptLong))*60/3600;
      if (ptSide === "W") {
        convertedLong = -convertedLong;
      }
      tbl.set(r, valCol, convertedLat);
      tbl.set(r, longCol, convertedLong);
    }
  }
  // set any missing locations
  let firstLoc = setMissingStartLocations(tbl);
  let lastLoc = setMissingEndLocations(tbl);
  setMissingMiddleLocations(tbl, firstLoc, lastLoc);
}

function getExtents(tbl) {
  let numCols = tbl.getColumnCount();
  let arr = [];
  for (let col = 0; col < numCols; col++) {
    arr.push(getColumnExtents(tbl, col));
  }
  return arr;
}

function getColumnExtents(tbl, col) {
  let numRows = tbl.getRowCount();
  let least = 0;
  let greatest = 0;

  for (let r = 0; r < numRows; r++) {
    let val = Number(tbl.get(r, col));
    if (isNaN(val)) {
      continue;
    }
    if (val < least || r === 0) {
      least = val;
    }
    if (val > greatest || r === 0) {
      greatest = val;
    }
  }

  return { "least": least, "greatest": greatest };
}


function colFromName(tbl, colName) {
  let numCols = tbl.getColumnCount();
  for (var j = 0; j < numCols; j++) {
    if (tbl.columns[j].trim() === colName) {
      break;
    }
  }
  if (j === numCols) {
    return;
  }
  return j;
}

function setMissingStartLocations(tbl) {
  let valCol = colFromName(tbl, "Latitude");
  let longCol = colFromName(tbl, "Longitude");
  let firstLoc = 0;
  let ptLat = tbl.get(firstLoc, valCol);
  let ptLong = tbl.get(firstLoc, longCol);
  if (ptLat === "" || ptLong === "") {
    firstLoc = getNextGoodLocation(tbl, firstLoc);
    if (firstLoc > 0) {
      let ptLat = tbl.get(firstLoc, valCol);
      let ptLong = tbl.get(firstLoc, longCol);
      for (let j = 0; j < firstLoc; j++) {
        tbl.set(j, valCol, ptLat);
        tbl.set(j, longCol, ptLong);
      }
    }
  }
  return firstLoc;
}


function setMissingEndLocations(tbl) {
  let valCol = colFromName(tbl, "Latitude");
  let longCol = colFromName(tbl, "Longitude");
  let numRows = tbl.getRowCount();
  let lastLoc = numRows - 1;
  let ptLat = tbl.get(lastLoc, valCol);
  let ptLong = tbl.get(lastLoc, longCol);
  if (ptLat === "" || ptLong === "") {
    for (lastLoc--; lastLoc > 0; lastLoc--) {
      let ptLat = tbl.get(lastLoc, valCol);
      let ptLong = tbl.get(lastLoc, longCol);
      if (ptLat !== "" && ptLong !== "") {
        for (let k = lastLoc + 1; k < numRows; k++) {
          tbl.set(k, valCol, ptLat);
          tbl.set(k, longCol, ptLong);
        }
        break;
      }
    }
  }
  return lastLoc;
}


function setMissingMiddleLocations(tbl, firstLoc, lastLoc) {
  let valCol = colFromName(tbl, "Latitude");
  let longCol = colFromName(tbl, "Longitude");
  for (let missingLoc = firstLoc + 1; missingLoc < lastLoc; missingLoc++) {
    let ptLat = tbl.get(missingLoc, valCol);
    let ptLong = tbl.get(missingLoc, longCol);
    if (ptLat === "" || ptLong === "") {
      let nextGoodRow = getNextGoodLocation(tbl, missingLoc + 1);
      if (nextGoodRow === -1) {
        continue;
      }
      let prevGoodRow = missingLoc - 1;
      let prevLat = tbl.get(prevGoodRow, valCol);
      let prevLong = tbl.get(prevGoodRow, longCol);
      let nextLat = tbl.get(nextGoodRow, valCol);
      let nextLong = tbl.get(nextGoodRow, longCol);
      for (; missingLoc < nextGoodRow; missingLoc++) {
        ptLat = map(missingLoc, prevGoodRow, nextGoodRow, prevLat, nextLat);
        ptLong = map(missingLoc, prevGoodRow, nextGoodRow, prevLong, nextLong);
        tbl.set(missingLoc, valCol, ptLat);
        tbl.set(missingLoc, longCol, ptLong);
      }
    }
  }
}


function getNextGoodLocation(tbl, r) {
  let valCol = colFromName(tbl, "Latitude");
  let longCol = colFromName(tbl, "Longitude");
  let numRows = tbl.getRowCount();
  for (let j = r; j < numRows; j++) {
    if (tbl.get(j, valCol) !== "" && tbl.get(j, longCol) !== "") {
      return j;
    }
  }
  return -1;
}

