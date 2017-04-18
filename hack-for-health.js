var map;
var tempData;

function initMap() {
          map = new google.maps.Map(document.getElementById("incident-map"), {
                    center: {
                              lat: 37.868
                              , lng: -122.7
                    }
                    , zoom: 11
                    , draggable: false
                    , zoomControl: false
                    , scrollwheel: false
                    , disableDoubleClickZoom: false
          });
}
$('.thermometer').thermometer();

function submitButtonPressed() {
          clearDataLayer(map);
          if (document.getElementById("ending-year-input").value == "") {
                    var startingDate = new Date(1990, 1, "1").toISOString();
                    var endingDate = new Date(2050, 1, "1").toISOString();
                    var query = "https://data.marincounty.org/resource/7bzr-ymkc.json?$where=time_call_was_received between \"" + startingDate.substring(0, startingDate.length - 1) + "\" and \"" + endingDate.substring(0, endingDate.length - 1) + "\"";
          }
          else {
                    var startingDate = new Date(Number.parseInt(document.getElementById("starting-year-input").value), Number.parseInt(document.getElementById("starting-month-input").value) + 1, Number.parseInt(document.getElementById("starting-day-input").value)).toISOString();
                    var endingDate = new Date(Number.parseInt(document.getElementById("ending-year-input").value), Number.parseInt(document.getElementById("ending-month-input").value) + 1, Number.parseInt(document.getElementById("ending-day-input").value)).toISOString();
                    var query = "https://data.marincounty.org/resource/7bzr-ymkc.json?$where=time_call_was_received between \"" + startingDate.substring(0, startingDate.length - 1) + "\" and \"" + endingDate.substring(0, endingDate.length - 1) + "\"";
          }
          if (document.getElementById("myonoffswitch").checked) {
                    query += " AND incident_zip_postal=\"" + document.getElementById("zipcode-input").value + "\"";
          }
          console.log(query);
          fetchData(query);
}

function fetchData(query) {
          $.ajax({
                    url: query
                    , type: "GET"
                    , data: {
                              "$limit": 1000000000
                              , "$$app_token": "TAw3tmDMrmYeS4VfgW2fiOqIn"
                    }
          }).done(function (data) {
                    tempData = data;
                    onDataFetched(data);
          });
}

function onDataFetched(data) {
          drawZipcodes(map, data);
          drawBarChart("primary-injury-div", "Primary Injury", countInstances(extractColumn(data, "injury_primary")));
          drawPieChart("disposition-div", "Patient Disposition", countInstances(extractColumn(data, "disposition")));
          drawPieChart("protocol-div", "EMS Protocol", countInstances(extractColumn(data, "protocol_used")));
          drawPieChart("where-patient-was-transported-div", "Hospital", countInstances(extractColumn(data, "transported_to_destination")));
          drawPieChart("gender-div", "Gender", countInstances(extractColumn(data, "gender")));
}

function drawZipcodes(map, data) {
          var zipTotalBundle = countInstances(extractColumn(data, "incident_zip_postal"));
          map.data.loadGeoJson("zipcodes.json");
          map.data.setStyle(function (feature) {
                    var index = zipTotalBundle[0].indexOf(feature.getProperty("ZCTA5CE10"));
                    if (index > -1) {
                              return ({
                                        fillColor: toHSL(zipTotalBundle[1][index] / feature.getProperty("population"), getIncidentToPopulationRatios()[0], getIncidentToPopulationRatios()[1], 100, 50)
                                        , strokeColor: "#000000"
                                        , strokeWeight: 2
                              });
                    }
                    else {
                              return ({
                                        fillColor: "#000000"
                                        , strokeColor: "#000000"
                                        , strokeWeight: 0
                              });
                    }
          });
          map.data.addListener('mouseover', function (event) {
                    var index = zipTotalBundle[0].indexOf(event.feature.getProperty("ZCTA5CE10"));
                    map.data.revertStyle();
                    map.data.overrideStyle(event.feature, {
                              strokeWeight: 6
                    });
                    document.getElementById("info-paragraph").innerHTML = "Zipcode: " + event.feature.getProperty("ZCTA5CE10") + "<br>Incidents: " + zipTotalBundle[1][index] + "<br>Population: " + event.feature.getProperty("population")
          });
          map.data.addListener('mouseout', function (event) {
                    map.data.revertStyle();
                    document.getElementById("info-paragraph").innerHTML = "Mouse over the regions for more information."
          });
          map.data.addListener('click', function (event) {
                    document.getElementById("zipcode-input").value = event.feature.getProperty("ZCTA5CE10");
          });
}

function clearDataLayer(map) {
          map.data.forEach(function (feature) {
                    map.data.remove(feature);
          });
}

function toHSL(ratio, minRatio, maxRatio, brightness, saturation) {
          if (ratio > maxRatio) {
                    var hsl = 0;
          }
          else {
                    var hsl = 120 - 120 * ((ratio - minRatio) / (maxRatio - minRatio));
          }
          return "hsl(" + hsl + ", " + brightness + "%, " + saturation + "%)";
}

function extractColumn(data, property) {
          var result = [];
          for (var i = 0; i < data.length; i++) {
                    result.push(data[i][property]);
          }
          return result;
}

function countInstances(instances) {
          var uniqueInstances = [];
          var totals = [];
          for (var i = 0; i < instances.length; i++) {
                    var index = uniqueInstances.indexOf(instances[i]);
                    if (index > -1) {
                              totals[index]++;
                    }
                    else if (index == -1 && instances[i] != undefined) {
                              uniqueInstances.push(instances[i]);
                              totals.push(1);
                    }
          }
          return [uniqueInstances, totals];
}

function getIncidentToPopulationRatios() {
          // Todo: Do not hardcode these values you stupid.
          return [(1310 / 24283), (10567 / 17167)];
}

function getAverageResponseTime(data) {
          var sum = 0;
          var total = 0;
          for (var i = 0; i < data.length; i++) {
                    if (data[i].time_call_was_received < data[i].time_arrived_at_patient) {
                              var startingDate = new Date(data[i].time_call_was_received).getTime();
                              var endingDate = new Date(data[i].time_arrived_at_patient).getTime();
                              sum += endingDate - startingDate;
                              total++;
                    }
          }
          return sum / total;
}

function millisecondsToReadableString(milliseconds) {
          var hours = Math.round((milliseconds / 1000) / 3600);
          var minutes = Math.round((milliseconds / 1000) / 60);
          var seconds = Math.round(milliseconds / 1000);
          return hours + "hours, " + minutes + ", minutes" + seconds + ", seconds";
}

function drawPieChart(divID, title, slices) {
          var data = [{
                    values: slices[1]
                    , labels: slices[0]
                    , type: 'pie'
                    , textinfo: "none"
    }];
          var layout = {
                    showlegend: false
                    , height: 350
                    , paper_bgcolor: 'rgba(0,0,0,0)'
                    , plot_bgcolor: 'rgba(0,0,0,0)'
                    , width: 400
                    , title: title
          };
          Plotly.newPlot(divID, data, layout, {
                    displayModeBar: false
          });
}

function arrayToPercent(array) {
          var sum = 0
          for (i = 0; i <= (array.length - 1); i++) {
                    sum += array[i]
          }
          for (i = 0; i <= (array.length - 1); i++) {
                    array[i] = round(((100 * array[i]) / sum), 2)
          }
          return array
}

function round(value, decimals) {
          return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function drawBarChart(divID, title, slices) {
          console.log(slices[1])
          var data = [{
                    x: arrayToPercent(slices[1])
                    , y: slices[0]
                    , name: 'pecentages'
                    , opacity: 1
                    , orientation: 'h'
                    , showlegend: true
                    , type: 'bar'
                    , uid: '2f399e'
                    , visible: true
          }];
          layout = {
                    autosize: true
                    , barmode: 'group'
                    , barnorm: ''
                    , paper_bgcolor: 'rgba(0,0,0,0)'
                    , plot_bgcolor: 'rgba(0,0,0,0)'
                    , height: 640
                    , margin: {
                              l: 210
                              , pad: 4
                    }
                    , showlegend: false
                    , title: title
                    , width: 400
                    , xaxis: {
                              autorange: true
                              , range: [0, 60]
                              , title: 'pecentages'
                              , type: 'linear'
                    }
                    , yaxis: {
                              autorange: false
                              , range: [0, 30]
                              , title: ''
                              , type: 'category'
                    }
          };
          Plotly.newPlot(divID, data, layout, {
                    displayModeBar: false
          });
}
