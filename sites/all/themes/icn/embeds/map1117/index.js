// grabbing width and height of parent container
var height = document.getElementById("map-container").clientHeight;
var width = document.getElementById("map-container").clientWidth;

var active = d3.select(null);

// setting up global variables
var table;
var titles;
var headers;
var rows;
var body;

var marginLeft = 0;
var marginTop = 0;

var data;

// selections and appending structural elements
var svgContainer = d3.select("#map-container")
                     .append("div");

// this box will containg SVG
var svgBox = svgContainer.attr("id", "svgBox");

// this box will contain buttons
var selectButtons = svgContainer.append("div")
                                .attr("class", "button-container");

// appending buttons to page
var buttonData = [{ value: "countryView", label: "By state" },
                  { value: "projectView", label: "By project"}];

var buttons = selectButtons.selectAll(".buttons")
                           .data(buttonData)
                           .enter()
                           .append("button")
                           .attr("type", "button")
                           .attr("class", "buttons")
                           .attr("id", function(d) { return d.value; })
                           .html(function(d) { return d.label; } )
                           .attr("value", function(d) { return d.value; } )
                           .on("click", buttonClicked);

// appending svg to page
var canvas = d3.select("#svgBox")
               .append("svg")
               .attr("id", "svg1")
               .attr("width", width)
               .attr("height", function(d) { if (width  > 400) { return height }
                                             else { return 300 }
                                            })
               .on("click", stopped, true);

// appending background rect for resetting zoom
var rect = canvas.append("rect")
                 .attr("class", "background")
                 .attr("width", width)
                 .attr("height", height)
                 .on("click", reset);

// appending group to svg. This is where the drwaing happens
var svg = canvas.append("g")
                .attr('transform', 'translate(' + marginLeft + ',' + marginTop + ')');

// appending svg for legends/keys
var svgFixed = d3.select("#svgBox")
                  .append("svg")
                  .attr("id", "svg2")
                  .style("left", function(d) { if (width > 400) { return 50 + "px" }
                                                   else { return 0 + "px" }
                                                 })
                  .style("top", function(d) { if (width > 400) { return - 170 + "px" }
                                                   else { return 0 + "px" }
                                                  })
                  .append("g");

// appending divs for tooltip
var tooltip = d3.select("#svgBox")
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

var stateTooltip = d3.select("#svgBox")
                      .append("div")
                      .attr("class", "state-tooltip")
                      .style("opacity", 0);

//set up the projection for the map
var albersProjection = d3.geoAlbersUsa()            //tell it which projection to use
                          .scale((width + 100))     //tell it how big the map should be
                          .translate(translateMap(width, height)) //set the center of the map to show up in the center of the screen

function translateMap(width, height) {
  if (width > 400) {
    return [(width/2), (height/2)];
  } else { return [(width/2), (height/3)] }
};

var zoom = d3.zoom()
             .scaleExtent([1, 30])
             .on("zoom", zoomed);

//set up the path generator function to draw the map outlines
path = d3.geoPath()
    .projection(albersProjection);        //tell it to use the projection that we just made to convert lat/long to pixels

canvas.call(zoom);

var formatComma = d3.format(",")

// creating array to force order in legend
var priority_order = ["Federal", "State", "Local", "Private", "Unknown"]

// setting Lookup maps
var locationLookup = d3.map(); // location will return [long, lat]
var costLookup = d3.map(); // state will return cost
var stateLookup = d3.map(); // location will return state

// number formatting functions
var formatNoDecimalComma = d3.format(",.0f")
var formatMoney = function(d) { return "$ " + formatNoDecimalComma(d); };

// parser functions to change zeros and nulls for Data N/A
function parseLength(value) {
  if (value == "$0" || value == "0.00" || value == "0" || value == "") {
    return "Data N/A";
  } else {
    return value;
  }
};

// parser function to change zeros and nulls for Data N/A
function parseCost(value) {
  if (value == "$0" || value == "0.00" || value == "0" || value == "") {
    return "Data N/A";
  } else {
    return "$ " + value;
  }
};

// setting up file loading queue
queue()
  .defer(d3.json, "../sites/all/themes/icn/embeds/map1117/cb_2016_us_state_20m.json")  // import the map geoJSON
  .defer(d3.csv, "../sites/all/themes/icn/embeds/map1117/beachnourishment_2016.csv")   // import the data from the .csv file
  .defer(d3.csv, "../sites/all/themes/icn/embeds/map1117/state_totals.csv")            // import the data from the .csv file
  .defer(d3.json, "../sites/all/themes/icn/embeds/map1117/cities_us.json")             // import the data from the .json file
  .await(function(err, dataIn, circleData, stateData, usCities) {

    // parsing By project data
    circleData.forEach(function(d) {
      d.latitude = +d.lat;
      d.longitude = +d.long;
      d.cost_2016 = parseCost(d.cost_2016); //
      d.length = parseLength(d.length);
      locationLookup.set(d.location, [d.longitude, d.latitude]);  // location will return [long, lat]
      stateLookup.set(d.location, d.state); // location will return state
      d["Length"] = d.length;
      d["Primary funding"] = d.fund_source;
      d["Cost"] = d.cost_2016;
      d["Year"] = d.year;
    });

    // parsing By state data
    stateData.forEach(function(d) {
      d.total_cost = +d.total_cost; // parsing for number
      costLookup.set(d.state, d.total_cost); // state will return cost
    });

    // creating array listing states on By state data
    var stateList = stateData.map( function(d) { return d.state; });
    var stateSTUSPS = stateData.map( function(d) { return d.STUSPS; });

    // creating array listing cost on By state data
    var stateCost = stateData.map( function(d) { return d.total_cost; });

    // finding the center of each state path
    var centroids = dataIn.features.map(function (feature){
            return {state: feature.properties.NAME, center: path.centroid(feature)};
    });

    // filtering list of centers with states listed on By state data
    var filteredCentroids = centroids.filter(function(centroid){
                                return stateList.filter(function(stateList_el){
                                  return stateList_el == centroid.state;
                                }).length != 0
    });

    // nesting By project data to append only one circle per location
    var counter = d3.nest()
                     .key(function(d) { return d.location})
                     .entries(circleData);

    // creating array listing every location
    var mapping = counter.map( function(d) { return d.key }).sort(d3.ascending);

    // passing data By project data to global variable
    data = counter;

    // creating array listing the funding sources
    var nested = d3.nest()
                    .key(function(d) { return d.fund_source } )
                    .sortKeys(function(a,b) { return priority_order.indexOf(a) - priority_order.indexOf(b); })
                    .entries(circleData);

    //  setting up color scheme
    var colorScheme = ["#BDE58A", "#1FAB9E", "#F7CE2F", "#CC5944"];

    // setting up ranges for scaling
    var scaleArray = [{scale: "1-2", value: 3},
                      {scale: "3-6", value: 7},
                      {scale: "7-9", value: 10},
                      {scale: "10+", value: 11}];


    var thresholdScale = scaleArray.map( function(d) { return d.value });

    var scaleLookup = d3.map();
    scaleArray.forEach(function(d) { scaleLookup.set(d.value, d.scale); });

    var colorScale = d3.scaleThreshold().domain(thresholdScale).range(colorScheme);

    var maxCost = d3.max(stateCost);

    var minCost = d3.min(stateCost);

    var sizingScale = d3.scalePow().domain([minCost, maxCost]).range([5, 20]);

    // appending map
    svg.append("g")
        .attr("class", "map-tile")
        .selectAll("path")               //make empty selection
        .data(dataIn.features)           //bind to the features array in the map data
        .enter()
        .append("path")                  //add the paths to the DOM
        .attr("d", path)                 //actually draw them
        .attr("class", "feature")
        .attr("id", function(d) { return d.properties.STUSPS })
        .attr('fill','#EEEEEE')
        .attr('stroke','#4A4A4A')
        .attr('stroke-width',.4);

    for (var i = 0; i < stateSTUSPS.length; i++) {
      d3.select("#" + stateSTUSPS[i])
        .on("mouseover", function(d) { d3.select(this)
                                         .attr("fill", "#C0C0C0") })
        .on("mouseout", function(d) { d3.select(this)
                                        .attr('fill','#EEEEEE') })
        .on("click", clicked);
    };

    // appending rects for geocoded cities
    svg.append("g")
        .attr("class", "cities")
        .selectAll('.cities')
        .data(usCities)
        .enter()
        .append("rect")
        .attr("class", "cities")
        .attr("id", function(d) { return d.city })
        .attr("x", function(d) { return albersProjection([d.longitude, d.latitude])[0] })
        .attr("y", function(d) { return albersProjection([d.longitude, d.latitude])[1] })
        .attr("fill", "#fbd052")
        .attr("fill-opacity", 0)
        .attr("height", 0)
        .attr("width", 0);

    // appending labels for cities
    svg.append("g")
        .attr("class", "cities")
        .selectAll('.label')
        .data(usCities)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("id", function(d) { return d.city })
        .attr("x", function(d) { return albersProjection([d.longitude, d.latitude])[0] })
        .attr("y", function(d) { return albersProjection([d.longitude, d.latitude])[1] })
        .attr("dx", -0.5)
        .attr("dy", -1)
        .style("font-size", 0)
        .text(function(d) { return d.city });

    // appending circles with By state data
    svg.append("g")
        .attr("class", "state-circles")
        .selectAll(".state-data")
        .data(filteredCentroids)
        .enter()
        .append('circle')
        .attr("class", "state-data")
        .attr("value", function(d) { return sizingScale(costLookup.get(d.state)); })
        .attr("r", function(d) { return sizingScale(costLookup.get(d.state)); })
        .attr("cx", function (d){ return d.center[0]; })
        .attr("cy", function (d){ return d.center[1]; })
        .attr("stroke", "#83BE44")
        .attr("stroke-width", 1.5)
        .attr("fill", "#83BE44")
        .attr("fill-opacity", .6)
        .on("mouseover", mouseoverStates)
        .on("mouseout", mouseoutStates);

      // appending circles with By project data
      svg.append("g")
          .attr("class", "circles")
            .style("opacity", 0)
          .selectAll("circle")
          .data(mapping)
          .enter()
          .append("circle")
          .attr("class", "circle")
          .attr("id", function(d) { return d })
          .attr("cx", function(d) { return albersProjection(locationLookup.get(d))[0] })
          .attr("cy", function(d) { return albersProjection(locationLookup.get(d))[1] })
          .attr('r', 8)
          .attr("fill", function(d) {
              var selection = d3.select(this).attr("id");

              var getLength = getData(selection).length;

              return colorScale(getLength)
          })
          .attr("stroke", function(d) {
              var selection = d3.select(this).attr("id");

              var getLength = getData(selection).length;

              return colorScale(getLength)
          })
          .attr("stroke-width", 1.5)
          .attr("fill-opacity", 0)
          .on("mouseover", mouseoverProjects)
          .on("mouseout", mouseoutProjects);

 // appending legends/keys to svg2
 // By project data
 var legendProjects = svgFixed.append("g")
                              .attr("class", "legend")
                              .attr("transform", "translate(" + 30 + "," + 60 + ")")

 var legendTitle_1 = legendProjects.append("g")
                                 .attr("transform", "translate(-8,-32)")
                                 .append("text")
                                 .attr("class", "legend-title")
                                 .text("Number of nourishment")

 var legendTitle_2 = legendProjects.append("g")
                                 .attr("transform", "translate(-8,-16)")
                                 .append("text")
                                 .attr("class", "legend-title")
                                 .text("projects by location")

 var legendTitle_3 = legendProjects.append("g")
                                 .attr("transform", "translate(-8,0)")
                                 .append("text")
                                 .attr("class", "legend-title")
                                 .text("since 1990")

 var legendCircle = legendProjects.append("g")
                                  .attr("transform", "translate(0,15)")
                                  .selectAll(".legend-circle")
                                  .data(thresholdScale)
                                  .enter()
                                  .append("circle")
                                  .attr("class", "legend-circle")
                                  .attr("cx", 0)
                                  .attr("cy", function(d,i) { return i * 20 })
                                  .attr("r", 8)
                                  .attr("fill", function(d) { return colorScale(d-1); })
                                  .attr("fill-opacity", 0)
                                  .attr("stroke", function(d) { return colorScale(d-1) })
                                  .attr("stroke-width", 1.5);

  var legendLabel = legendProjects.append("g")
                                  .attr("transform", "translate(0,15)")
                                  .selectAll(".legend-label")
                                  .data(thresholdScale)
                                  .enter()
                                  .append("text")
                                  .attr("class", "legend-label")
                                  .attr("x", 12)
                                  .attr("y", function(d,i) { return 5 + (i * 20) })
                                  .text(function(d) { return scaleLookup.get(d); });

  // By state data
  var legendState = svgFixed.append("g")
                              .attr("class", "legend-country")
                              .attr("transform", "translate(" + 20 + "," + 60 + ")");

  var legendStateTitle_1 = legendState.append("g")
                                        .attr("transform", "translate(0,-16)")
                                        .append("text")
                                        .attr("class", "legend-title")
                                        .text("Cost of nourishment");

  var legendStateTitle_2 = legendState.append("g")
                                        .attr("transform", "translate(0,0)")
                                        .append("text")
                                        .attr("class", "legend-title")
                                        .text("projects since 1990");

  var legendCircleTitle = legendState.append("g")
                                        .attr("transform", "translate(25,55)")
                                        .selectAll(".legend-circle")
                                        .data([1000000, 1000000000])
                                        .enter()
                                        .append("circle")
                                        .attr("cx", 0)
                                        .attr("cy", function(d) { return sizingScale(-d); })
                                        .attr("r", function(d) { return sizingScale(d); })
                                        .attr("fill","#83BE44")
                                        .attr("fill-opacity",.3)
                                        .attr("stroke", "#83BE44")
                                        .attr("stroke-width", 1.5);

  var legendCircleLabel = legendState.append("g")
                                        .attr("transform", "translate(-5,20)")
                                        .selectAll(".legend-label")
                                        .data([1000000, 1000000000])
                                        .enter()
                                        .append("text")
                                        .attr("class", "legend-label")
                                        .style("text-anchor", "start")
                                        .attr("x", function(d,i) { return 45; })
                                        .attr("y", function(d,i) { return - (-50 + i * 30); })
                                        .text(function(d) { return formatMoney(d); });

  // calling function to set default view
  showCountry();

  });

// handling transforms on objects when zooming
function zoomed() {
  svg.attr("transform", d3.event.transform);

  // state paths
  d3.selectAll(".feature").transition()
                          .duration(25)
                          .attr("stroke-width", .4 / d3.event.transform.k);

  // By project circles
  d3.selectAll(".circle").transition()
                         .duration(50)
                         .attr("r", function() { if (d3.event.transform.k < 5) { return 8 / d3.event.transform.k }
                                                 else { return 8 / (d3.event.transform.k * 0.6) } })
                         .attr("stroke-width", 1.5 / d3.event.transform.k);

 // By state circles
 d3.selectAll(".state-data").transition()
                        .duration(50)
                        .attr("stroke-width", 1.5 / d3.event.transform.k);


    // handling cities and cities names
    if (d3.event.transform.k > 6) {
      d3.selectAll(".label").transition()
                            .duration(200)
                            .style("font-size", 2.5 + "px");

      d3.selectAll(".cities").transition()
                             .duration(200)
                             .attr("fill-opacity", 1)
                             .attr("height", .7 )
                             .attr("width", .7 );

    } else if (d3.event.transform.k < 2) {

      d3.selectAll(".label").style("font-size", 0 + "px");

      d3.selectAll(".cities").transition()
                             .duration(200)
                             .attr("fill-opacity", 0)
                             .attr("height", 0 )
                             .attr("width", 0 );

    } else {
      d3.selectAll(".label").transition()
                            .duration(200)
                            .style("font-size", 1 * d3.event.transform.k + "px");

      d3.selectAll(".cities").transition()
                             .duration(200)
                             .attr("fill-opacity", 1)
                             .attr("height", .2 * d3.event.transform.k)
                             .attr("width", .2 * d3.event.transform.k);
    }

};

function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
};

// click function calculating boundaries for state paths on zoom
function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true)

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  canvas.transition()
        .duration(750)
        .call( zoom.transform, d3.zoomIdentity.translate(translate[0],translate[1]).scale(scale) );
};

// click outside the map to zoom out
function reset() {
  active.classed("active", false);
  active = d3.select(null);

  canvas.transition()
        .duration(750)
        .call( zoom.transform, d3.zoomIdentity );
};

// data update
function getData(newSelection) {

    return data.filter(function(d){ return d.key == newSelection })[0].values
               .sort(function(a,b) { return a.year - b.year; })
};

// button function hides By project data, shows By state data
function showCountry() {

    d3.selectAll("button").attr("class", "buttons");

    d3.select("#countryView").attr("class", "clicked");

    d3.selectAll(".state-circles")
      .transition()
      .duration(500)
      .style("opacity", 1);

      function numberParser(value) {
        return +value
      }

    d3.selectAll(".state-data")
      .transition()
      .duration(500)
      .attr("r", function(d) { return  numberParser(d3.select(this).attr("value")) });

    d3.selectAll(".cities")
      .transition()
      .duration(500)
      .style("opacity", 0);

    d3.selectAll(".circle")
      .transition()
      .duration(500)
        .attr("r", 0);

    d3.selectAll(".circles")
      .transition()
      .duration(500)
      .style("opacity", 0);

    d3.selectAll(".circle").on("mouseover", "");

    d3.selectAll(".legend").transition().duration(500).attr("opacity", 0);
    d3.selectAll(".legend-country").transition().duration(500).attr("opacity", 1);
};

// button function hides By state data, shows By project data
function showProjects() {

  d3.selectAll("button").attr("class", "buttons");

  d3.select("#projectView").attr("class", "clicked");

  d3.selectAll(".state-circles")
    .transition()
    .duration(500)
      .style("opacity", 0);

  d3.selectAll(".state-data")
    .transition()
    .duration(500)
    .attr("r", 0);

  d3.selectAll(".cities")
    .transition()
    .duration(500)
    .style("opacity", 1);

    d3.selectAll(".circle")
      .transition()
      .duration(500)
        .attr("r", 7);

  d3.selectAll(".circles")
    .transition()
    .duration(500)
    .style("opacity", 1);

    d3.selectAll(".circle").on("mouseover", mouseoverProjects);

    d3.selectAll(".legend-country").transition().duration(500).attr("opacity", 0);
    d3.selectAll(".legend").transition().duration(500).attr("opacity", 1);
};

// calling different button functions
function buttonClicked(button) {
    var selection = button.value;

  if (selection == "countryView") {
      showCountry();

  } else if (selection == "projectView") {
      showProjects()
  }

};

// hover functions for By project and By state circles, includes data Enter/Update/Exit selections
function mouseoverProjects(d,i) {
      var thisEl = d3.select(this)

          thisEl.transition()
                .duration(500)
                .attr("fill-opacity", 1);

      var selection = d3.select(this).attr("id");

      var newData = getData(selection);

      var length = newData.length;

      tooltip.transition()
             .duration(300)
             .style("opacity", .9)

      tooltip.style("left", function() { if (d3.event.pageX > (width / 2)) {
                                            return d3.event.pageX - 240 + "px"
                                       } else {
                                            return d3.event.pageX + 10 + "px"
                                       }
                                     })
             .style("top", d3.event.pageY - 28 + "px")

      var tooltipInfo = tooltip.append("div")
                               .attr("class", "tooltip-content");

          tooltipInfo.html(function() { if (length > 1) {
                   return  "<p class='location'><span class='state'>" + stateLookup.get(d) + " |</span> " + d + "</p>"
                         + "<p class='info'>has <b>" + length + "</b> nourishment projects since 1990";

           } else { return "<p class='location'><span class='state'>" + stateLookup.get(d) + " |</span> " + d + "</p>"
                         + "<p class='info'>has <b>" + length + "</b> nourishment project since 1990" ;
                 }

          $("span#colored").css("color", "red");

        });

      drawTable(newData)

      tooltipInfo.style("opacity", 1)

};

function mouseoutProjects(d,i) {
  var thisEl = d3.select(this)

      thisEl.transition()
            .duration(200)
            .attr("fill-opacity", 0);

  var emptyData = [];

  tooltip.style("opacity", 0)
         .style("left", 0)
         .style("top", 0);

  var tooltipInfo = d3.selectAll(".tooltip-content")
                      .data(emptyData);

      tooltipInfo.exit().remove()

  var tableRemove = d3.selectAll("table")
                      .data(emptyData)

      tableRemove.exit().remove();

};

function mouseoverStates(d,i) {

            stateTooltip.style("opacity", 1)
                        .style("left", function() { if (d3.event.pageX > (width / 2)) {
                                                        return d3.event.pageX - 110 + "px"
                                                   } else {
                                                        return d3.event.pageX + 10 + "px"
                                                   }
                                                 })
                         .style("top", d3.event.pageY - 28 + "px");

            stateTooltip.html("<p class='location'>" + d.state + "</p>" +
                              "<p class='info'>" + formatMoney(costLookup.get(d.state)) + "</p>")

          };

function mouseoutStates(d,i) {

                      stateTooltip.style("opacity", 0)
                                  .style("left", 0)
                                  .style("top", 0);

                      stateTooltip.html("");
}

// drawing table on tooltip
function drawTable(data) {

    table = d3.select(".tooltip-content").append("table");

    var titles = ["Year", "Primary funding", "Length", "Cost"]

    headers = table.append("thead")
                       .append("tr")
                       .selectAll("th")
                       .data(titles)
                       .enter()
                       .append("th")
                       .text(function (d) { return d; })

    body = table.append("tbody");

    rows = body.selectAll("tr")
                .data(data)
                .enter()
                .append("tr");

           rows.selectAll("td")
                   .data(function (d) {
                        return titles.map(function (k) {
                            return { "value": d[k], "name": k};
                                       });
                       })
                  .enter()
                  .append("td")
                  .html(function (d) { return d.value; });
};
