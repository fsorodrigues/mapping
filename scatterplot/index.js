var width = 700;
var height = 700;
var radius = 6;

var margin = { "top": 50,
               "bottom": 50,
               "left": 100,
               "right": 0 };

var svg = d3.select("svg")
             // .append("svg")
             .attr("height", height)
             .attr("width", width)
             .append("g")
             .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var tooltip = d3.select("body")
                 .append("div")
                 .attr("class", "tooltip")
                 .style("opacity", 0);

var formatDecimalComma = d3.format(",.2f");

var colorScale;

d3.csv("beach_nour_clean.csv", function (dataIn) {

  // parsing for number output
  dataIn.forEach(function(d){
      d.volume = +d.volume;
      d.cost_2013 = +d.cost_2013;

  });

  console.log(dataIn);

  var nested = d3.nest()
                  .key( function(d) { return d.fund_source })
                  .entries(dataIn);

  console.log(nested);

  var fundMap = nested.map( function(d) { return d.key }).sort(d3.ascending);

  console.log(fundMap);

  var cats = fundMap.length;

  // var colorScheme = d3.schemeRdBu[cats];
  var colorScheme = d3.schemePuOr[cats];


  colorScale = d3.scaleOrdinal(colorScheme).domain(fundMap);

  // setting dynamic scales for axis
  var maxX = getMaxX(dataIn);
  console.log(maxX)
  scaleX = d3.scaleLinear()
               .domain([0, maxX])
               .range([0, 600])
               .nice(); // making scale end in round number

  var maxY = getMaxY(dataIn);
  console.log(maxY)
  scaleY = d3.scaleLinear()
              .domain([maxY,0])
              .range([0, 600])
              .nice(); // making scale end in round number

  // calling axis
  xAxis(scaleX);
  yAxis(scaleY);
  //
  drawPlot(dataIn);

  var legend = svg.append("g")
                  .attr("class", "legend")
                  .attr("transform", "translate(" + 520 + "," + 15 + ")")

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
                           .attr("r", radius)
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

function getMaxX(dataset) {
      var xMax = d3.max(dataset, function(d) { return d.cost_2013 });
      return Math.ceil(xMax / 10) * 10
}

function getMaxY(dataset) {
      var yMax = d3.max(dataset, function(d) { return d.volume });
      return Math.round(yMax / 100) * 100;
}

function drawPlot(dataset) {

  var scatterPlot = svg.selectAll("circle")
                        .data(dataset);

      scatterPlot.transition()
                    .duration(500)
                    .ease(d3.easeSin)
                 .attr("cx", function(d) { return scaleX(d.cost_2013) })
                 .attr("cy", function(d) { return scaleY(d.volume) })
                 .attr("r", radius)
                 .attr("fill", function(d) { return colorScale(d.fund_source) })
                 .attr("stroke", function(d) { return colorScale(d.fund_source) })
                 .attr("stroke-width", 1.5)
                 .attr("fill-opacity", 0)
                //  .attr("fill", function(d) { return makeColor(d.hrsNum, (d.gamesAgainst/2)) })
                 .attr("opacity", 1);

      scatterPlot.enter()
                  .append("circle")
                  .attr("cx", function(d) { return scaleX(d.cost_2013) })
                  .attr("cy", function(d) { return scaleY(d.volume) })
                  .attr("r", radius)
                  .on("mouseover", mouseOver)
                  .on("mouseout", mouseOut)
                    .transition()
                    .duration(500)
                    .ease(d3.easeSin)
                  .attr("r", radius)
                  .attr("fill", function(d) { return colorScale(d.fund_source) })
                  .attr("stroke", function(d) { return colorScale(d.fund_source) })
                  .attr("stroke-width", 1.5)
                  .attr("fill-opacity", 0)
                  // .attr("fill", function(d) { return makeColor(d.hrsNum, (d.gamesAgainst/2)) })
                  .attr("opacity", 1);

      scatterPlot.exit()
                  .transition()
                  .duration(300)
                  .ease(d3.easeSin)
                .attr("r", 0)
               .remove();

};

function xAxis(scale) {

    var xAxis = d3.axisBottom(scale)
                   .ticks(5)
                   .tickSizeInner(- height + margin.bottom + margin.top )
                   .tickSizeOuter(0)
                   .tickPadding(8);

    svg.append("g")
        .attr("transform", "translate(0," + (height - margin.bottom - margin.top)  + ")" )
        .attr("class", "xAxis")
        .call(xAxis);

};

function yAxis(scale) {

     var yAxis = d3.axisLeft(scale)
                    .ticks(5)
                    .tickSizeInner(- (width - margin.left) )
                    .tickSizeOuter(0)
                    .tickPadding(8);

     svg.append("g")
         .attr("transform", "translate(0,0)")
         .attr("class", "yAxis")
         .call(yAxis);
};

function mouseOver(d) {

        tooltip.transition()
               .duration(300)
               .style("opacity", 0.9);

        tooltip.html("<b>" + d.location + "</b>"
                           + "<br>" + d.state + " in " + d.year
                           + "<br>$: " + formatDecimalComma(d.cost_2013)
                           + "<br>CY: " + formatDecimalComma(d.volume)
                           + "<br>$/CY: " + formatDecimalComma((d.cost_2013 / d.volume)) )
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

        d3.select(this).attr("fill-opacity", 1);

              };

function mouseOut() {
        tooltip.transition()
               .duration(50)
               .style("opacity", 0);

        tooltip.html("");

        d3.select(this).attr("fill-opacity", 0);
                           };
