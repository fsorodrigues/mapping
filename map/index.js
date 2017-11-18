var width = document.getElementById('svg1').clientWidth; // grabbing browser window width
var height = document.getElementById('svg1').clientHeight; // grabbing browser window height
var active = d3.select(null)

var marginLeft = 0;
var marginTop = 0;

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

function parseDollars(value) {
  if (value == "$0" || value == "") {
    return "Cost data not available";
  } else {
    return value;
  }
}

queue()
  .defer(d3.json, "./cb_2016_us_state_20m.json") // import the map geoJSON
  .defer(d3.csv, "./beach_nour.csv")             // import the data from the .csv file
  .defer(d3.json, "./cities_us.json")            // import the data from the .json file
  .await( function(err, dataIn, circleData, usCities) {

    circleData.forEach(function(d) {
      d.latitude = +d.lat;
      d.longitude = +d.long;
      d.cost_2013 = parseDollars(d.cost_2013);
      // d.cost_2013 = parseInt(d.cost_2013.replace("$", ""));
      // d.growth_from_2000_to_2013 = parseFloat(d.growth_from_2000_to_2013.replace("%", ""));

    })

    console.log(circleData);

    var nested = d3.nest()
                    .key( function(d) { return d.fund_source })
                    .entries(circleData);

    console.log(nested);

    var fundMap = nested.map( function(d) { return d.key }).sort(d3.ascending);

    console.log(fundMap);

    var cats = fundMap.length;

    // var colorScheme = d3.schemeRdBu[cats];
    var colorScheme = d3.schemePuOr[cats];


    var colorScale = d3.scaleOrdinal(colorScheme).domain(fundMap);

    svg.selectAll("path")               //make empty selection
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

    svg.selectAll('.circle')
        .data(circleData)
        .enter()
        .append("circle")
        .attr("class", "circle")
        .attr("id", function(d) { return d.location })
        .attr("cx", function(d) { return albersProjection([d.longitude, d.latitude])[0] })
        .attr("cy", function(d) { return albersProjection([d.longitude, d.latitude])[1] })
        .attr('r', 7)
        .attr("fill", function(d) { return colorScale(d.fund_source) })
        .attr("stroke", function(d) { return colorScale(d.fund_source) })
        .attr("stroke-width", 1.5)
        .attr("fill-opacity", 0)
        .on("mouseover", function(d) {
            tooltip.transition()
                   .duration(200)
                   .style("opacity", 1);

            tooltip.html("<b>" + d.location + "</b> <br>" + d.cost_2013 + "<br>" + d.fund_source)
                   .style("left", (d3.event.pageX + 10) + "px")
                   .style("top", (d3.event.pageY - 40) + "px");

            d3.select(this)
              .transition()
              .duration(200)
              .attr("fill-opacity", 1);
        })
        .on("mouseout", function(d) {
              tooltip.transition()
                     .duration(200)
                     .style("opacity", 0);

              tooltip.html("")
                     .style("left", 0)
                     .style("top", 0);

             d3.select(this)
               .transition()
               .duration(200)
               .attr("fill-opacity", 0);
        });


 var legend = svg.append("g")
                 .attr("class", "legend")
                 .attr("transform", "translate(" + .9 * width + "," + .8 * height + ")")

 var legendTitle = legend.append("g")
                         .attr("transform", "translate(-8,0)")
                         .append("text")
                         .attr("class", "legend-title")
                         .text("Funding type")

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

console.log(d3.event.transform.k)

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
