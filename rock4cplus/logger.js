import { exec } from 'node:child_process';
import serialport from 'serialport';
import Readline from '@serialport/parser-readline';
import fs from 'node:fs/promises'

let port;
try {
  port = new serialport.SerialPort({
    baudRate: 9600,
    path: "/dev/ttyACM0"
  });
  // This can maybe cause port to become undefined
  // at a random time, which can cause other
  // crashes, but oh well
  port.on("error", (err) => {
    console.error("Warning: Serialport ttyACM0 emitted error:\n   ", err.message);
    port = undefined;
  });
} catch (err) {
  console.error(err);
  port = undefined;
}

const parser = new Readline.ReadlineParser({
  delimeter : '\n'
})


const apiKey = "281932b2-cbc1-4e42-828a-e8fc61549de3";
const url = "https://badetemperaturer.yr.no/api/registrere";

let temp

// lager ett array for alle 60 measurements i minuttet
let waterLevelArray = []
// lager ett array for alle valide measurements
let validWaterLevelArray = []

async function readJSON(filePath) {
  const text = await fs.readFile(filePath, "utf-8");
  return JSON.parse(text);
}

async function writeJSON(filePath, data) {
  const text = JSON.stringify(data);
  await fs.writeFile(filePath, text, "utf8");
}

const waterLevelFilePath = "./db/waterLevelFile.json"
const waterTemperatureFilePath = "./db/waterTemperatureFile.json"

let waterLevel = await readJSON(waterLevelFilePath)
let waterTemperature = await readJSON(waterTemperatureFilePath)

async function startMeasurements() {
  if (!(port == undefined)) {
    // mottar vannstandsdata far arduino
    port.pipe(parser);
    parser.on('data', (data) => {
        waterLevelArray.push(parseFloat(data))
        if(parseFloat(data) < 500){
            validWaterLevelArray.push(parseFloat(data))
        }
    });
    setInterval(getWaterLevel ,60000)
  } else {
    console.error("Warning: Could not start waterlevel measurements, port undefined");
  }
    setInterval(getWaterTemperature ,60000)
    setInterval(postRequestYr ,1200000)
}

function getWaterTemperature(){
    try{
      exec("digitemp_DS9097 -q -t 0", async function (error, stdout, stderr) {
        temp = parseFloat(stdout)
        if(temp<50){
          console.log('temperatur: ',stdout)
          const date = Math.ceil(((new Date()).getTime())/1000)
          waterTemperature.measurements.push([date, temp])
          await writeJSON(waterTemperatureFilePath, waterTemperature)
        }else{
            console.error("Error: temperatur, registrert temperatur: ", temp, "\n    stderr gave following: ", stderr)
        }
    });
    }
    catch(err){
        console.error(err)
    }
}

async function postRequestYr(){
    const date = (new Date()).toISOString().slice(0,19)

    const payload = [
            {
            "name": "Hovsvatnet",
            "lat": 58.49370,
            "lon": 6.50388,
            "heatedWater": false,
            "temperature": temp.toFixed(1),
            "time": date
            }
        ];

    try{
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                apikey: apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        console.log("POST request status: ", response.status);
    }
    catch(err){
        console.error(err)
    }
}

async function getWaterLevel(){
    const date = Math.ceil(((new Date()).getTime())/1000)
    try{
        // sjekker om det er noen valide measurements og sender da til databasen
        if(validWaterLevelArray[5]){
          validWaterLevelArray.sort(function (a, b) { return a - b });
          let medianWaterlevel = validWaterLevelArray[Math.floor(validWaterLevelArray.length / 2)].toFixed(1)
          console.log("waterlevel: " + medianWaterlevel)
          waterLevel.measurements.push([date, medianWaterlevel])
          writeJSON(waterLevelFilePath, waterLevel)
        }else{
            console.log("Error: vannstand, registrerte vannstander: ", waterLevelArray)
        }
        waterLevelArray = []
        validWaterLevelArray = [];
    }
    catch(err){
        console.error(err)
    }
}

startMeasurements()
