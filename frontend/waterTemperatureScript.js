//-------------------------------------------------------------------------------------
//GOOGLE CHARTS
let googleDataArray

async function drawChart(array, enhet = "Temperatur (°C)") {
    await google.charts.load('current', {'packages':['corechart']});
    // Set Options
    const options = {
        hAxis: {title: 'Dato',
                gridlines: {color: 'white'},
                textStyle: {color: 'white'},
                titleTextStyle: {color: 'white'}
                },
        vAxis: {title: enhet,
                gridlines: {color: 'white'},
                textStyle: {color: 'white'},
                titleTextStyle: {color: 'white'}
                },
        backgroundColor: { fill: 'rgb(5, 50, 65)'},
        chartArea: {'width': '90%', 'height': '100%', 'top':50, 'bottom':50},
        legend: {
            textStyle: {color: 'white'},
            position: 'top'
            },
        colors: ['white'],
    };
    // Draw
    googleDataArray = google.visualization.arrayToDataTable(array);
    const chart = new google.visualization.AreaChart(document.getElementById('myChart'));
    chart.draw(googleDataArray, options);
}

//-------------------------------------------------------------------------------------
//FIREBASE 

const firebaseConfig = {
    apiKey: "AIzaSyDQDHZs3gI26M_JI-NtNvjomFg4hlGR0lE",
    authDomain: "hovsvannet.firebaseapp.com",
    databaseURL: "https://hovsvannet-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hovsvannet",
    storageBucket: "hovsvannet.appspot.com",
    messagingSenderId: "895103776628",
    appId: "1:895103776628:web:8108b99fc7b4ee30405e21"
};

const app = firebase.initializeApp(firebaseConfig);
const db = app.database();
const ref = db.ref('measurements');

//-----------------------------------------------------------------------------------------------
//Add data from local file to array
let allData = waterTemperatureFile;

const hovsvannet = {
    data: allData,
    graphType: "normal", //normal, average, stigningsgrad
    intervalSize: 1, //0=hours, 1=days, 2=months
    updateLastMeasurement: async function(){
        try{
            //Get last value measured
            const lastMeasurementSnapshot = await ref.limitToLast(1).once("value")
            const lastMeasurementObject = lastMeasurementSnapshot.val()
            //Display on website
            document.getElementById("lastMeasurement").innerHTML = "Temperaturen Nå: " + lastMeasurementObject[Object.keys(lastMeasurementObject)[0]].temp + "°C"
            document.getElementById("lastMeasurementDate").innerHTML = "Sist oppdatert: " + (new Date(lastMeasurementObject[Object.keys(lastMeasurementObject)[0]].dato*1000)).toString().slice(3,24)
        
        } catch(err){
            console.log("Error retrieving current measurement: ", err)
            document.getElementById("lastMeasurement").innerHTML = "Error: kunne ikke hente data"
            document.getElementById("lastMeasurementDate").innerHTML = ""
        }
       
    },
    updateLastIntervalStigningsgrad: function(array, interval){
        let i = array.length - 1
        while ((array[array.length-1][0] - array[i][0]) < interval){
            i = i - 1
        }
        //Display on website 
        const lastIntervalStigningsgrad = [array[i][0], array[array.length-1][0],(array[array.length-1][1] - array[i][1])]
        document.getElementById("stigning").innerHTML = "Stigning siste time: " + (lastIntervalStigningsgrad[2]).toFixed(2) +"°C"
        document.getElementById("stigningDate").innerHTML = "Stigning i perioden: kl." + (new Date(lastIntervalStigningsgrad[0]*1000)).toString().slice(16,24) + " - kl." + (new Date(lastIntervalStigningsgrad[1]*1000)).toString().slice(16,24)
    
        return lastIntervalStigningsgrad
    },
    getMax: function(dataInterval = this.data, display){
        let currentRecord = dataInterval[0][1]
        let currentArray = dataInterval[0]
        for (array of dataInterval){ 
            if (array[1]>currentRecord){
                currentRecord = array[1]
                currentArray = array
            }    
        }
        if(display === true){
            document.getElementById("maxRecordTable").innerHTML = "<td>" + currentArray[1] + "°C" + "</td><td style='font-size: 1rem'>" +(new Date(currentArray[0]*1000)).toString().slice(4,24)+"</td>" 
        }
        return currentArray
    },
    getMin: function(dataInterval = this.data, display){
        let currentRecord = dataInterval[0][1]
        let currentArray = dataInterval[0]
        for (array of dataInterval){ 
            if (array[1]<currentRecord){
                currentRecord = array[1]
                currentArray = array
            }    
        }
        if(display === true){
            document.getElementById("minRecordTable").innerHTML = "<td>" + currentArray[1] + "°C" + "</td><td style='font-size: 1rem'>" +(new Date(currentArray[0]*1000)).toString().slice(4,24)+"</td>" 
        }   
        return currentArray
    }
}
//-----------------------------------------------------------------------------------------------
//GETS DATA FROM THE END OF LOCALDATA TO NOW

const endOfWaterTemperatureFile = waterTemperatureFile[waterTemperatureFile.length-1][0];

async function getDataFromDB(){
    //Get last value measured and display on website
    hovsvannet.updateLastMeasurement()

    //Get missing data after local file and add to array with local data
    const snapshot = await ref.orderByChild('dato').startAt(endOfWaterTemperatureFile).once("value")
    const DBData = snapshot.val()
    console.log("Measurements retrieved from DB: ", Object.keys(DBData).length)
    Object.keys(DBData).forEach(element => {
        hovsvannet.data.push([DBData[element].dato, DBData[element].temp])
    });
    //Get stigningsgrad and display on website
    hovsvannet.updateLastIntervalStigningsgrad(hovsvannet.data, size[0])

    //Restrict dates available to pick based on data interval
    let date = new Date()
    let startDateInputFormat = (new Date(hovsvannet.data[0][0]*1000 - date.getTimezoneOffset()*60000)).toISOString().slice(0,16)
    let endDateInputFormat = (new Date(hovsvannet.data[hovsvannet.data.length-1][0]*1000 - date.getTimezoneOffset()*60000)).toISOString().slice(0,16)
    document.getElementById("startDateSelector").value = startDateInputFormat
    document.getElementById("startDateSelector").setAttribute("min", startDateInputFormat)
    document.getElementById("startDateSelector").setAttribute("max", endDateInputFormat)

    document.getElementById("endDateSelector").value = endDateInputFormat
    document.getElementById("endDateSelector").setAttribute("min", startDateInputFormat)
    document.getElementById("endDateSelector").setAttribute("max", endDateInputFormat)

    //Draw the chart with all the data
    chooseInterval(hovsvannet.graphType, hovsvannet.intervalSize)
}
//-----------------------------------------------------------------------------------------------
//Choose between two dates and show graph for the interval

function chooseInterval(graphType, intervalSize){
    let startDateSelectorValue = document.getElementById("startDateSelector").value
    let endDateSelectorValue = document.getElementById("endDateSelector").value 
    let startDate = (new Date(startDateSelectorValue))/1000
    let endDate = (new Date(endDateSelectorValue))/1000
    //-----------------------------------------------------------------------------------------------
    //POSSIBLE ERRORS

    document.getElementById("error").innerHTML = ""

    if(!startDateSelectorValue || !endDateSelectorValue){
        return document.getElementById("error").innerHTML = "error: <br> velg en startdato og en sluttdato"
    }  
    if(startDate >= endDate){
        return document.getElementById("error").innerHTML = "error: <br> velg en startdato som er før sluttdato"
    }
    if(startDate >= hovsvannet.data[hovsvannet.data.length-1][0]){
        return document.getElementById("error").innerHTML = "error: <br> velg en startdato før: <br>"+new Date(hovsvannet.data[hovsvannet.data.length-1][0]*1000)
    }
    if(endDate <= hovsvannet.data[0][0]){
        return document.getElementById("error").innerHTML = "error: <br> velg en sluttDato etter: <br>"+new Date(hovsvannet.data[0][0]*1000)
    }
    //-----------------------------------------------------------------------------------------------
    
    let allDataInterval = [];
    for (array of hovsvannet.data){
        if(array[0]>startDate && array[0]<endDate){
            allDataInterval.push(array)
        }
    }
    switch(graphType){
        case "average":
            drawChart(getShortArray(getAverage(intervalSize, allDataInterval), "Temperatur °C (gjennomsnitt pr. " + intervalSizeToText[intervalSize] + ")"));
            break;
        case "stigningsgrad":
            drawChart(getShortArray(getStigningsgrad(intervalSize, allDataInterval), "Temperatur °C / " + intervalSizeToText[intervalSize]),  "Temperatur (°C) / " + intervalSizeToText[intervalSize]);
            break;
        case "normal": 
            drawChart(getShortArray(allDataInterval), "Temperatur (°C)");
            break;
    }
    hovsvannet.getMin(allDataInterval, true)
    hovsvannet.getMax(allDataInterval, true)
    return allDataInterval
}

//-----------------------------------------------------------------------------------------------
//GET THE AVERAGE FOR THE CHOSEN INTERVALL

const dateMethods = [Date.prototype.getHours, Date.prototype.getDate, Date.prototype.getMonth];
const intervalSizeToText = ["Time", "Dag", "Måned"];
const size = [60*60, 60*60*24, 60*60*24*30];

function roundDate(dateOfAverage, dateMethod){
    dateOfAverage.setMinutes(0);
    dateOfAverage.setSeconds(0);
    switch(dateMethod){
        case 2:
            dateOfAverage.setDate(1);
            dateOfAverage.setHours(0);
            break;
        case 1: 
            dateOfAverage.setHours(0)
            break;
    }
    return dateOfAverage;
}

function getAverage(dateMethod, dataInterval){
    let averageArray = [];
    let averageIntervalSum = 0;
    let averageIntervalMeasurements = 0;
    for (let i = 0; i < dataInterval.length; i++){
        averageIntervalSum += dataInterval[i][1]
        averageIntervalMeasurements++
        
        if (dateMethods[dateMethod].call(new Date(dataInterval[i][0]*1000))-dateMethods[dateMethod].call(new Date(dataInterval[i+1][0]*1000)) != 0){
            let dateOfAverage = roundDate(new Date(dataInterval[i][0]*1000),dateMethod) 
            averageArray.push([dateOfAverage/1000,averageIntervalSum/averageIntervalMeasurements])
            averageIntervalMeasurements = 0
            averageIntervalSum = 0
        }
        if (i+2>=dataInterval.length){
            i++
            averageIntervalSum += dataInterval[i][1]
            averageIntervalMeasurements++
            let dateOfAverage = roundDate(new Date(dataInterval[i][0]*1000),dateMethod)
            averageArray.push([dateOfAverage/1000,averageIntervalSum/averageIntervalMeasurements])
        }
    }
    return averageArray
}

//-----------------------------------------------------------------------------------------------
//STIGNINGSGRAD

function getStigningsgrad(dateMethod, dataInterval){
    let stigningsgradArray = [];
    let startArray = dataInterval[0]
    for (let i = 0; i+1 < dataInterval.length; i++){
        if (dateMethods[dateMethod].call(new Date(dataInterval[i][0]*1000))-dateMethods[dateMethod].call(new Date(dataInterval[i+1][0]*1000)) != 0){
            let date = roundDate(new Date(dataInterval[i][0]*1000),dateMethod) 
            stigningsgradArray.push([date/1000,(dataInterval[i][1]-startArray[1])/((dataInterval[i][0]-startArray[0])/size[dateMethod])])
            startArray = dataInterval[i]
        }
    }
    return stigningsgradArray
}

//-----------------------------------------------------------------------------------------------
    //REDUCE THE NUMBER OF DATAPOINTS IN ARRAY/CHART TO INCREASE PERFORMANCE

const chartQuality = 1500
function getShortArray(dataInterval, enhet = "Temperatur (°C)"){
    let shortArray = [["Dato", enhet]]
    let pointsDrawn = 0
    let pointsStepSize = Math.ceil((dataInterval.length)/chartQuality)
    for (let i = 0; i < dataInterval.length; i += pointsStepSize){
        shortArray.push([new Date(dataInterval[i][0]*1000),dataInterval[i][1]])
        pointsDrawn++
    }
    console.log("points drawn: ", pointsDrawn)
    return shortArray
}

//-----------------------------------------------------------------------------------------------
//AverageSWITCH

function graphTypeSwitch(){
    hovsvannet.graphType = document.getElementById("graphTypeSelect").value
    chooseInterval(hovsvannet.graphType, hovsvannet.intervalSize)
}

function intervalSizeSwitch(){
    hovsvannet.intervalSize = parseInt(document.getElementById("intervalSizeSelect").value)
    chooseInterval(hovsvannet.graphType, hovsvannet.intervalSize)
}

//-----------------------------------------------------------------------------------------------
//CHOSE INTERVAL: LAST 24 HOURS, LAST WEEK or LAST MONTH
function setDataInterval(size){
        let lastMeasurementDate = new Date(hovsvannet.data[hovsvannet.data.length-1][0]*1000)
        lastMeasurementDate = new Date(lastMeasurementDate.getTime() - lastMeasurementDate.getTimezoneOffset()*60000)
        let startDate = (new Date(lastMeasurementDate.getTime() - size)).toISOString().slice(0,16);
        let endDate = lastMeasurementDate.toISOString().slice(0,16);
        document.getElementById("startDateSelector").value = startDate;
        document.getElementById("endDateSelector").value = endDate;
        chooseInterval(hovsvannet.graphType, hovsvannet.intervalSize);
}