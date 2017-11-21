var width = document.getElementById('svg1').clientWidth; // grabbing browser window width
var height = document.getElementById('svg1').clientHeight; // grabbing browser window height
var active = d3.select(null)

var marginLeft = 0;
var marginTop = 0;

var data;

var canvas = d3.select('svg')
               .on("click", stopped, true);

var rect = canvas.append("rect")
                 .attr("class", "background")
                 .attr("width", width)
                 .attr("height", height)
                 .on("click", reset);

var svg = canvas.append("g")
                .attr('transform', 'translate(' + marginLeft + ',' + marginTop + ')');

var tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

//set up the projection for the map
var albersProjection = d3.geoAlbersUsa()  //tell it which projection to use
                          .scale(1300)    //tell it how big the map should be
    .translate([(width/2), (height/2)]);  //set the center of the map to show up in the center of the screen

var zoom = d3.zoom()
             .scaleExtent([1, 30])
             .on("zoom", zoomed);

//set up the path generator function to draw the map outlines
path = d3.geoPath()
    .projection(albersProjection);        //tell it to use the projection that we just made to convert lat/long to pixels

var stateLookup = d3.map();

var sizeScale = d3.scaleLinear().range([0, 10]);

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

var sourceLookup = d3.map();

var lengthLookup = d3.map();

var costLookup = d3.map();

var yearLookup = d3.map();

queue()
  .defer(d3.json, "./cb_2016_us_state_20m.json") // import the map geoJSON
  .defer(d3.csv, "./beach_nour.csv")             // import the data from the .csv file
  .defer(d3.json, "./cities_us.json")            // import the data from the .json file
  .await( function(err, dataIn, circleData, usCities) {

    circleData.forEach(function(d) {
      d.latitude = +d.lat;
      d.longitude = +d.long;
      d.cost_2013 = parseZeros(d.cost_2013);
      d.fund_source = parseFundType(d.fund_source);
      d.length = parseZeros(d.length);
      locationLookup.set(d.location, [d.longitude, d.latitude]);
      sourceLookup.set(d.location, d.fund_source);
      lengthLookup.set(d.location, d.length);
      costLookup.set(d.location, d.cost_2013);
      yearLookup.set(d.location, d.year);
    });

    var counter = d3.nest()
                     .key(function(d) { return d.location})
                     .entries(circleData);

    var mapping = counter.map( function(d) { return d.key }).sort(d3.ascending);

    data = counter;

    // console.log(data);

    var nested = d3.nest()
                    .key(function(d) { return d.fund_source } )
                    .sortKeys(function(a,b) { return priority_order.indexOf(a) - priority_order.indexOf(b); })
                    .entries(circleData);

    var fundMap = nested.map( function(d) { return d.key });

    var cats = fundMap.length;

    // var colorScheme = d3.schemeRdBu[cats];
    // var colorScheme = d3.schemePuOr[cats];

    var colorScheme = ["#F16950", "#F6BB6E", "#FAD02F", "#B1D781", "#1FAB9E"];

    var colorScale = d3.scaleOrdinal().domain(fundMap).range(colorScheme);

    svg.append("g")
        .attr("class", "map-tile")
        .selectAll("path")               //make empty selection
        .data(dataIn.features)          //bind to the features array in the map data
        .enter()
        .append("path")                 //add the paths to the DOM
        .attr("d", path)                //actually draw them
        .attr("class", "feature")
        .on("click", clicked)
        .attr('fill','#EEEEEE')
        .attr('stroke','#4A4A4A')
        .attr('stroke-width',.4);

    svg.selectAll('.cities')
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

    svg.selectAll('.label')
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

      svg.append("g")
          .attr("class", "circles")
          .selectAll("circle")
          .data(mapping)
          .enter()
          .append("circle")
          .attr("class", "circle")
          .attr("id", function(d) { return d })
          .attr("cx", function(d) { return albersProjection(locationLookup.get(d))[0] })
          .attr("cy", function(d) { return albersProjection(locationLookup.get(d))[1] })
          .attr('r', 7)
          .attr("fill", function(d) { return colorScale(sourceLookup.get(d)) })
          .attr("stroke", function(d) { return colorScale(sourceLookup.get(d)) })
          .attr("stroke-width", 3)
          .attr("fill-opacity", 0)
          .on("mouseover", function(d,i) {
              var selection = d3.select(this).attr("id");

              var newData = getData(selection);

              tooltip.style("opacity", 1)
                     .style("left", (d3.event.pageX + 10) + "px")
                     .style("top", (d3.event.pageY - 40) + "px");

              var tooltipInfo = tooltip.append("g")
                                       .attr("class", "tooltip-group")
                                       .selectAll("div")
                                       .data(newData)
                                       .enter()
                                       .append("div")
                                       .attr("class", "tooltip-info")
                                       .style("background", function(f) { return colorScale(f.fund_source); })
                                       .html(function(e) { return  "<p class='location'>" + e.location + " (" + e.year + ")" +
                                       "</p><p class='info'>Primary funding source: " + e.fund_source +
                                       "</p><p class='info'>Cost: " + e.cost_2013 +
                                       "</p><p class='info'>Length of project (ft): " + e.length + "</p>"; })


          })
          .on("mouseout", function(d,i) {
            var emptyData = [];


            var tooltip_info = d3.selectAll(".tooltip-info")
                              .data(emptyData);

            tooltip_info.exit().remove();

            var tooltip_group = d3.selectAll(".tooltip-group")
                              .data(emptyData);

            tooltip_group.exit().remove();

          });

 var legend = svg.append("g")
                 .attr("class", "legend")
                 .attr("transform", "translate(" + .85 * width + "," + .8 * height + ")")

 var legendTitle = legend.append("g")
                         .attr("transform", "translate(-8,0)")
                         .append("text")
                         .attr("class", "legend-title")
                         .text("Number of projects")

 var legendCircle = legend.append("g")
                          .attr("transform", "translate(0,15)")
                          .selectAll(".legend-circle")
                          .data(fundMap)
                          .enter()
                          .append("circle")
                          .attr("class", "legend-circle")
                          .attr("cx", 0)
                          .attr("cy", function(d,i) { return i * 20 })
                          .attr("r", 8)
                          .attr("fill", function(d) { return colorScale(d); })
                          .attr("fill-opacity", 0)
                          .attr("stroke", function(d) { return colorScale(d) })
                          .attr("stroke-width", 1.5);

  var legendLabel = legend.append("g")
                           .attr("transform", "translate(0,15)")
                           .selectAll(".legend-label")
                          .data(fundMap)
                          .enter()
                          .append("text")
                          .attr("class", "legend-label")
                          .attr("x", 12)
                          .attr("y", function(d,i) { return 5 + (i * 20) })
                          .text(function(d) { return d; })

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

// console.log(d3.event.transform.k);

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
