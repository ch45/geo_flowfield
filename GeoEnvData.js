
// Latitude,Heading,Longitude,Heading,Time,GPS Altitude,GPS Altitude Units,PMS 1.0,PMS 2.5,PMS 10.0,Gas ADC,Gas Oxidizing,Gas Reducing,Gas NH3,Noise Low,Noise Mid,Noise High,Noise Total,Temperature,Humidity,Pressure,Altitude,Lux,Proximity']

class GeoEnvData {
  setupGeoEnvData() {
    print("setupGeoEnvData");
    for (let tbl of this.tblArr) {
      convertLatLong(tbl);
      let columnExtents = getExtents(tbl);
      print(columnExtents);
      this.columnExtents = mergeExtents(this.columnExtents, columnExtents);
    }
  }
  getBucketData(little_x_lim, little_y_lim) {
    // let arr = getZigZagBucketData(little_x_lim, little_y_lim, valColName, this.columnExtents, this.tbl);
    let arr =  getLocBucketData(this.tblArr, this.columnExtents, geoEnvData.readings, geoEnvData.x_axis, geoEnvData.y_axis, little_x_lim, little_y_lim);
    // print("bucket array length=" + arr.length);
    return arr;
  }
  constructor(csvDataArr) {
    print("GeoEnvData CONSTUCT");
    this.tblArr = [];
    if (typeof csvDataArr === 'undefined') {
      csvDataArr = geoEnvData.srcUrls;
    }
    for (let cvsData of csvDataArr) {
      this.tblArr.push(loadTable(cvsData, 'csv', 'header'));
    }
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
    let colName = tbl.columns[col].trim();
    arr[colName] = getColumnExtents(tbl, col);
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
    return -1;
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

function getZigZagBucketData(little_x_lim, little_y_lim, valColName, extents, tbl) {
  let arr = [];
  let least = extents[valColName].least;
  let greatest = extents[valColName].greatest;
  print(valColName + ': ' + least + " -> " + greatest);
  let valCol = colFromName(tbl, valColName);
  let numRows = tbl.getRowCount();
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
      let colVal = Number(tbl.get(index, valCol));
      if (isNaN(colVal)) {
        colVal = 0;
      }
      let val = map(colVal, least, greatest + 1, 0, 1);
      arr[y * little_x_lim + x] = val;
      index++;
      if (index > numRows) {
        index = 0;
      }
    }
  }
  return arr;
}

function getLocBucketData(tblArr, extents, readings, x_axis, y_axis, little_x_lim, little_y_lim) {
  let data = [];
  let locExtents = getNormalizedLocationExtents(extents, x_axis, y_axis);
  for (let tbl of tblArr) {
    let xCol = colFromName(tbl, x_axis);
    let yCol = colFromName(tbl, y_axis);
    let numRows = tbl.getRowCount();
    for (let row = 0; row < numRows; row++) {
      let x = Math.floor(map(Number(tbl.get(row, xCol)), locExtents.x.least, locExtents.x.greatest, 0, little_x_lim-1));
      let y = Math.floor(map(Number(tbl.get(row, yCol)), locExtents.y.greatest, locExtents.y.least, 0, little_y_lim-1));
      for (let reading of readings) {
        let colNum = colFromName(tbl, reading);
        if (colNum < 0) {
          continue;
        }
        let colVal = Number(tbl.get(row, colNum));
        if (isNaN(colVal)) {
          colVal = 0;
        }
        let val = map(colVal, extents[reading].least, extents[reading].greatest + 1, 0, 1);
        if (typeof data[y] === 'undefined') {
          data[y] = [];
        }
        if (typeof data[y][x] === 'undefined') {
          data[y][x] = {sum: val, count: 1};
        } else {
          data[y][x].sum += val;
          data[y][x].count++;
        }
      }
    }
  }
  let arr = [];
  for (let y in data ) {
    let offset = Number(y) * little_x_lim;
    for (let x in data[y] ) {
      if (typeof data[y][x] !== 'undefined') {
        let index = offset + Number(x);
        arr[index] = data[y][x].sum / data[y][x].count;
      }
    }
  }
  return arr;
}

function getNormalizedLocationExtents(extents, xColName, yColName) {
  let result = {x: {}, y: {}};
  result.x.greatest = extents[xColName].greatest;
  result.x.least = extents[xColName].least;
  result.y.greatest = extents[yColName].greatest;
  result.y.least = extents[yColName].least;

  let latDist = 10000000 * (result.y.greatest - result.y.least) / 90;
  let longDist = (result.x.greatest - result.x.least) / 360 * 40075017 * Math.cos(radians(map(0.5, 0, 1, result.y.least, result.y.greatest)));

  let metrePerPixelRatio = (latDist / windowHeight) / (longDist / windowWidth);
  // print(nfc(metrePerPixelRatio, 2));
  if (metrePerPixelRatio > 1) {
    let mid = map(0.5, 0, 1, result.x.least, result.x.greatest);
    result.x.greatest = map(metrePerPixelRatio, 0, 1, mid, result.x.greatest);
    result.x.least = map(metrePerPixelRatio, 0, 1, mid, result.x.least);
  } else {
    let mid = map(0.5, 0, 1, result.y.least, result.y.greatest);
    result.y.greatest = map(1 / metrePerPixelRatio, 0, 1, mid, result.y.greatest);
    result.y.least = map(1 / metrePerPixelRatio, 0, 1, mid, result.y.least);
  }

  return result;
}

function mergeExtents(existing, addition) {
  if (typeof existing === "undefined" || existing === null || existing.length === 0) {
    return extentsCopy(addition);
  }
  let result = extentsCopy(existing);
  for (let key in addition) {
    if (typeof result[key] === "undefined") {
      result[key] = {
        least: addition[key].least,
        greatest: addition[key].greatest
      };
    } else {
      if (result[key].least > addition[key].least) {
        result[key].least = addition[key].least;
      }
      if (result[key].greatest < addition[key].greatest) {
        result[key].greatest = addition[key].greatest;
      }
    }
  }
  return result;
}

function extentsCopy(src) {
  let copy = {};
  for (let key in src) {
    copy[key] = {
      least: src[key].least,
      greatest: src[key].greatest
    };
  }
  return copy;
}

