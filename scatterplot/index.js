var width = 700;
var height = 700;
var radius = 4;

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

var formatDecimalComma = d3.format(",.2f")

d3.csv("beach_nour_clean.csv", function (dataIn) {

  // parsing for number output
  dataIn.forEach(function(d){
      d.volume = +d.volume;
      d.cost_2013 = +d.cost_2013;

  });

  console.log(dataIn);

  // setting dynamic scales for axis
  var maxX = getMaxX(dataIn);
  console.log(maxX)
  scaleX = d3.scaleLinear()
               .domain([0, maxX])
               .range([0, 700])
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
                 .attr("fill", "red")
                //  .attr("fill", function(d) { return makeColor(d.hrsNum, (d.gamesAgainst/2)) })
                 .attr("opacity", .2);

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
                  .attr("fill", "red")
                  // .attr("fill", function(d) { return makeColor(d.hrsNum, (d.gamesAgainst/2)) })
                  .attr("opacity", .2);

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
              };

function mouseOut() {
        tooltip.transition()
               .duration(50)
               .style("opacity", 0);

        tooltip.html("")
                           };
