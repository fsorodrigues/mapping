var height = 639;
var width = 924;
var active = d3.select(null)

var marginLeft = 0;
var marginTop = 0;

var data;

var svgBox = d3.select(".svgBox")
                .attr("width", width)
                .attr("height", height);

var selectButtons = d3.select(".button-container")
                      .attr("width", width)
                      .attr("height", height);

var buttonData = [{ value: "countryView", label: "States" },
                  { value: "projectView", label: "Projects"}]

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

var canvas = d3.select(".svgBox")
               .append("svg")
               .attr("id", "svg1")
               .attr("width", width)
               .attr("height", height)
               .on("click", stopped, true);

var rect = canvas.append("rect")
                 .attr("class", "background")
                 .attr("width", width)
                 .attr("height", height)
                 .on("click", reset);

var svg = canvas.append("g")
                .attr('transform', 'translate(' + marginLeft + ',' + marginTop + ')');

var svgFixed = d3.select(".svgBox")
                  .append("svg")
                  .attr("id", "svg2")
                  .style("left", width - 56)
                  .style("top", height - 60)
                  .append("g");

var tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

var stateTooltip = d3.select("body")
                      .append("div")
                      .attr("class", "state-tooltip")
                      .style("opacity", 0);

//set up the projection for the map
var albersProjection = d3.geoAlbersUsa()  //tell it which projection to use
                          .scale(900)    //tell it how big the map should be
    .translate([(width/2), (height/2)]);  //set the center of the map to show up in the center of the screen

var zoom = d3.zoom()
             .scaleExtent([1, 30])
             .on("zoom", zoomed);

//set up the path generator function to draw the map outlines
path = d3.geoPath()
    .projection(albersProjection);        //tell it to use the projection that we just made to convert lat/long to pixels

var stateLookup = d3.map();

canvas.call(zoom);

var formatComma = d3.format(",")

function parseZeros(value) {
  if (value == "$0" || value == "0" || value == "") {
    return "Data N/A";
  } else {
    return value;
  }
}

function parseFundType(value) {
  if (value == "County" || value == "Local") {
    return "Local";
  } else {
    return value;
  }
}

var priority_order = ['Federal', "State", 'Local', 'Private', "Unknown"]

var locationLookup = d3.map();

var costLookup = d3.map();

var formatDecimalComma = d3.format(",.2f");
var formatMoney = function(d) { return "$" + formatDecimalComma(d); };

queue()
  .defer(d3.json, "./cb_2016_us_state_20m.json") // import the map geoJSON
  .defer(d3.csv, "./beach_nour.csv")             // import the data from the .csv file
  .defer(d3.csv, "./state_totals.csv")             // import the data from the .csv file
  .defer(d3.json, "./cities_us.json")            // import the data from the .json file
  .await( function(err, dataIn, circleData, stateData, usCities) {

    circleData.forEach(function(d) {
      d.latitude = +d.lat;
      d.longitude = +d.long;
      d.cost_2013 = parseZeros(d.cost_2013);
      d.fund_source = parseFundType(d.fund_source);
      d.length = parseZeros(d.length);
      locationLookup.set(d.location, [d.longitude, d.latitude]);
    });

    stateData.forEach(function(d) {
      d.total_cost = +d.total_cost;
      costLookup.set(d.state, d.total_cost);
    });

    var stateList = stateData.map( function(d) { return d.state; });

    console.log(stateList);

    var stateCost = stateData.map( function(d) { return d.total_cost; });

    var centroids = dataIn.features.map(function (feature){
            return {state: feature.properties.NAME, center: path.centroid(feature)};
    });

    var filteredCentroids = centroids.filter(function(centroid){
                                return stateList.filter(function(stateList_el){
                                  return stateList_el == centroid.state;
                                }).length != 0
    });

    var counter = d3.nest()
                     .key(function(d) { return d.location})
                     .entries(circleData);

    var mapping = counter.map( function(d) { return d.key }).sort(d3.ascending);

    data = counter;

    var nested = d3.nest()
                    .key(function(d) { return d.fund_source } )
                    .sortKeys(function(a,b) { return priority_order.indexOf(a) - priority_order.indexOf(b); })
                    .entries(circleData);

    // var fundMap = nested.map( function(d) { return d.key });
    //
    // var cats = fundMap.length;

    var colorScheme = ["#BDE58A", "#1FAB9E", "#F7CE2F", "#CC5944"];

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
        .on("click", clicked)
        .attr('fill','#EEEEEE')
        .attr('stroke','#4A4A4A')
        .attr('stroke-width',.4);

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

    // appending circles with state data
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
        .attr("fill-opacity", .3)
        .on("mouseover", function(d) {

                    stateTooltip.style("opacity", 1)
                                .style("left", (d3.event.pageX + 10) +  "px")
                                .style("top", (d3.event.pageY - 10) +  "px");

                    stateTooltip.html("<p class='location'>" + d.state + "</p>" +
                                      "<p class='info'>" + formatMoney(costLookup.get(d.state)) + "</p>")

                  })
        .on("mouseout", function(d) {

                    stateTooltip.style("opacity", 0)
                                .style("left", (d3.event.pageX + 10) +  "px")
                                .style("top", (d3.event.pageY - 10) +  "px");

                    stateTooltip.html("")

                  });

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
          .attr('r', 7)
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
          .on("mouseover", mouseover)
          .on("mouseout", mouseout);

 var legendProjects = svgFixed.append("g")
                              .attr("class", "legend")
                              .attr("transform", "translate(" + 30 + "," + 40 + ")")

 var legendTitle = legendProjects.append("g")
                                 .attr("transform", "translate(-8,0)")
                                 .append("text")
                                 .attr("class", "legend-title")
                                 .text("Nourishments since 1990")

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

  var legendCountry = svgFixed.append("g")
                              .attr("class", "legend-country")
                              .attr("transform", "translate(" + 30 + "," + 40 + ")");

  var legendCountryTitle = legendCountry.append("g")
                                        .attr("transform", "translate(-8,0)")
                                        .append("text")
                                        .attr("class", "legend-title")
                                        .text("Cost since 1990");

  var legendCircleTitle = legendCountry.append("g")
                                        .attr("transform", "translate(25,55)")
                                        .selectAll(".legend-circle")
                                        .data([minCost, maxCost])
                                        .enter()
                                        .append("circle")
                                        .attr("cx", 0)
                                        .attr("cy", function(d) { return sizingScale(-d); })
                                        .attr("r", function(d) { return sizingScale(d); })
                                        .attr("fill","#83BE44")
                                        .attr("fill-opacity",.3)
                                        .attr("stroke", "#83BE44")
                                        .attr("stroke-width", 1.5);

  var legendCircleLabel = legendCountry.append("g")
                                        .attr("transform", "translate(0,15)")
                                        .selectAll(".legend-label")
                                        .data([minCost, maxCost])
                                        .enter()
                                        .append("text")
                                        .attr("class", "legend-label")
                                        .style("text-anchor", "start")
                                        .attr("x", function(d,i) { return 45; })
                                        .attr("y", function(d,i) { return - (-50 + i * 30); })
                                        .text(function(d) { return formatMoney(d); });

  showCountry();

  });

function zoomed() {
  svg.attr("transform", d3.event.transform);

  d3.selectAll(".feature").transition()
                          .duration(25)
                          .attr("stroke-width", .4 / d3.event.transform.k);

  d3.selectAll(".circle").transition()
                         .duration(25)
                         .attr("r", 7 / d3.event.transform.k)
                         .attr("stroke-width", 1.5 / d3.event.transform.k);

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

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  canvas.transition()
        .duration(750)
        .call( zoom.transform, d3.zoomIdentity );
};

function getData(newSelection) {

    return data.filter(function(d){ return d.key == newSelection })[0].values
};

function showCountry() {

    d3.selectAll("button").attr("class", "buttons");

    d3.select("#countryView").attr("class", "active");

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

function showProjects() {

  d3.selectAll("button").attr("class", "buttons");

  d3.select("#projectView").attr("class", "active");

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

    d3.selectAll(".circle").on("mouseover", mouseover);

    d3.selectAll(".legend-country").transition().duration(500).attr("opacity", 0);
    d3.selectAll(".legend").transition().duration(500).attr("opacity", 1);
};

function buttonClicked(button) {
    var selection = button.value;

  if (selection == "countryView") {
      showCountry();

  } else if (selection == "projectView") {
      showProjects()
  }

};

function mouseover(d,i) {
      var thisEl = d3.select(this)

          thisEl.transition()
                .duration(200)
                .attr("fill-opacity", 1);

      var selection = d3.select(this).attr("id");

      var newData = getData(selection);

      var length = newData.length;

      tooltip.style("opacity", 1)
             .style("left", function(d) {
               if (d3.event.pageX > 600) {
                 if (length == 1) {
                   return ((d3.event.pageX - 210) + "px")
                 } else if (length == 2) {
                   return ((d3.event.pageX - 410) + "px")
                 } else {
                   return ((d3.event.pageX - 610) + "px")
                 }
               } else {
                 return ((d3.event.pageX + 10) + "px")
               }
             })
             .style("width", function(d) {
               if (d3.event.pageX > 600) {
                 if (length == 1) {
                   return 200 + "px"
                 } else if (length == 2) {
                   return 400 + "px"
                 } else {
                   return 600 + "px"
                 }
               } else {
                 return 600 + "px"
               }
             })
             .style("flex-direction", function(d) {
               if (d3.event.pageX > 600) {
                 if (length > 1) {
                   return "row-reverse"
                 } else {
                   return "row"
                 }
               } else {
                 return "row"
               }
             })
             .style("top", 0)
             .style("height", "100%");

             // console.log(d3.event.pageY);

      var tooltipInfo = tooltip.selectAll("div")
                               .data(newData)
                               .enter()
                               .append("div")
                               .attr("class", "tooltip-info")
                               .style("opacity", 0)
                               .style("background", "#EEEEEE" )
                               .html(function(e,r) { return "<p class='location'>" + (r+1) + " " + e.location + " (" + e.year + ")" +
                               "</p><p class='info'>Primary funding source: " + e.fund_source +
                               "</p><p class='info'>Cost: " + e.cost_2013 +
                               "</p><p class='info'>Length of project (ft): " + e.length + "</p>"; });

      tooltipInfo.transition()
                 .duration(200)
                 .style("opacity", 1)

};

function mouseout(d,i) {
  var thisEl = d3.select(this)

      thisEl.transition()
            .duration(200)
            .attr("fill-opacity", 0);

  var emptyData = [];

  tooltip.style("opacity", 0)
         .style("left", 0)
         .style("top", 0)
         .style("height", 0)
         .style("width", 0);

  var tooltipInfo = d3.selectAll(".tooltip-info")
                      .data(emptyData);

  tooltipInfo.exit().remove()

  var tooltipGroup = d3.selectAll(".tooltip-group")
                        .data(emptyData);

  tooltipGroup.exit().remove();
};
