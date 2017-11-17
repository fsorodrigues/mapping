var width = document.getElementById('svg1').clientWidth;
var height = document.getElementById('svg1').clientHeight;
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
                          .scale(1200)    //tell it how big the map should be
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

queue()
  .defer(d3.json, "./cb_2016_us_state_20m.json") // import the map geoJSON
  .defer(d3.csv, "./beach_nour.csv")          // import the data from the .csv file
  .await( function(err, dataIn, circleData) {

    circleData.forEach(function(d) {
      d.latitude = +d.lat;
      d.longitude = +d.long;
      // d.cost_2013 = parseInt(d.cost_2013.replace("$", ""));
      // d.growth_from_2000_to_2013 = parseFloat(d.growth_from_2000_to_2013.replace("%", ""));

    })

    console.log(circleData);

    var nested = d3.nest()
                    .key( function(d) { return d.fund_source })
                    .entries(circleData);

    console.log(nested);

    var fundMap = nested.map( function(d) { return d.key })

    console.log(fundMap);

    var cats = fundMap.lenght;

    var colorScale = d3.scaleOrdinal(d3.schemeRdYlGn[6]).domain(fundMap);

  // popData.forEach(function(d) {
  //   stateLookup.set(d.name, d.population);
  // });

  // sizeScale.domain([0, d3.max(
  //                         popData.map(
  //                           function(d) {
  //                             return d.population;
  // }))]);

    svg.selectAll("path")               //make empty selection
        .data(dataIn.features)          //bind to the features array in the map data
        .enter()
        .append("path")                 //add the paths to the DOM
        .attr("d", path)                //actually draw them
        .attr("class", "feature")
        .on("click", clicked)
        .attr('fill','#EEEEEE')
        .attr('stroke','#777777')
        .attr('stroke-width',.4);

    svg.selectAll('.circle')
        .data(circleData)
        .enter()
        .append("circle")
        .attr("class", "circle")
        .attr("id", function(d) { return d.location })
        .attr("cx", function(d) { return albersProjection([d.longitude, d.latitude])[0] })
        .attr("cy", function(d) { return albersProjection([d.longitude, d.latitude])[1] })
        .attr('r', 5)
        .attr("fill", "red")
        .attr("fill", function(d) { return colorScale(d.fund_source) })
        .attr("fill-opacity", .2)
        .on("mouseover", function(d) {
            tooltip.transition()
                   .duration(200)
                   .style("opacity", .8);

            tooltip.html("<b>" + d.location + "</b> <br>" + d.cost_2013)
                   .style("left", (d3.event.pageX + 10) + "px")
                   .style("top", (d3.event.pageY - 40) + "px");
        })
        .on("mouseout", function(d) {
              tooltip.transition()
                     .duration(200)
                     .style("opacity", 0);

              tooltip.html("")
                     .style("left", 0)
                     .style("top", 0);
        });

  });

function zoomed() {
  svg.attr("transform", d3.event.transform);

  d3.selectAll(".feature").transition()
                          .duration(250)
                          .attr("stroke-width", .4 / d3.event.transform.k);

  d3.selectAll(".circle").transition()
                         .duration(250)
                         .attr("r", 5 / d3.event.transform.k)
                         .attr("fill-opacity", 0.2 * d3.event.transform.k);
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
        .call( zoom.transform, d3.zoomIdentity.translate(translate[0],translate[1]).scale(scale) ); // updated for d3 v4
};

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  canvas.transition()
        .duration(750)
        .call( zoom.transform, d3.zoomIdentity ); // updated for d3 v4
};
