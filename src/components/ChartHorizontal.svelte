<script>
  import { min, max, scaleLinear, scaleSqrt, scaleQuantize } from "d3";

  import Bubble from "./Bubble.svelte";
  import TimeLineHorizontal from "./TimelineHorizontal.svelte";

  export let data;
  export let xRange;
  export let yRange;
  export let circleRange;

  let width;
  let height;

  $: paddingTop = height / 10; //TODO: make dynamic based on window dimensions
  $: paddingBottom = height / 10;
  $: paddingLeft = width / 3;
  $: paddingRight = height / 10;
  $: innerWidth = width - paddingLeft - paddingRight;
  $: innerHeight = height - paddingTop - paddingBottom;

  $: xScale = scaleLinear()
    .domain(xRange)
    .range([paddingLeft, width - paddingRight]);

  $: yScale = scaleLinear()
    .domain(yRange)
    .range([paddingTop, height - paddingBottom]);

  // find the difference between subsequent years to adjust the circle scale (we want less white space if the minimum
  // difference is > 1 year)
  // this assumes that the data is ordered by year
  $: yearsArr = [...years];
  $: yearsDiff = [];
  $: yearsArr.forEach((year, idx) => {
    if (yearsArr[idx - 1]) yearsDiff.push(yearsArr[idx] - yearsArr[idx - 1]);
  });

  $: circleScale = scaleSqrt()
    .domain(circleRange)
    .range(
      min(yearsDiff) < 2
        ? [10, (innerWidth / 10 - 11 * 2) / 2]
        : [10, innerWidth / 10 / 2]
    );

  $: console.log((innerWidth / 10 - 11 * 2) / 2 / 2);
  // create scales to map radius to number of strokes, stroke width and stroke length
  // scaleQuantize maps a continuous domain to a discrete range
  $: strokeNumScale = scaleQuantize().domain(circleRange).range([30, 40]); //currently not using

  $: strokeWidthScale = scaleLinear().domain(circleRange).range([1.5, 3]);

  // $: strokeLengthScale = scaleLinear().domain(circleRange).range([9, 14]);
  $: strokeLengthScale = scaleLinear().domain(circleRange).range([7, 11]);

  $: renderedData = data.map((d) => {
    return {
      movie: d.Movie,
      x:
        (Math.floor(d.Year / 10) -
          min(data.map((d) => Math.floor(d.Year / 10)))) %
          2 ===
        0
          ? xScale(d.Year % 10)
          : xScale(9 - (d.Year % 10)),
      // reverse the y scale for every other decade - found by subtracting each decade from the first decade & determining if even or odd
      y: yScale(Math.floor(d.Year / 10)),
      budget: circleScale(d.Budget),
      boxoffice: circleScale(d.BoxOffice),
      rating: (d.RottenTomatoes_Tomatometer + d.RottenTomatoes_Audience) / 2,
      //   strokeNum: strokeNumScale(max([d.Budget, d.BoxOffice])),
      strokeWidth: strokeWidthScale(max([d.Budget, d.BoxOffice])),
      strokeLength: strokeLengthScale(max([d.Budget, d.BoxOffice])),
      year: d.Year,
      minYear: min(years),
    };
  });

  // create dataset of points for every year between the min and max to draw our timeline
  // this is so that we ensure we show the transition between the first & last years in every decade
  const years = new Set(data.map((d) => d.Year));
  let allYears = [];
  $: for (let currYear = min(years); currYear <= max(years); currYear++) {
    allYears.push({
      Year: currYear,
    });
  }
  $: timelineData = allYears.map((d) => {
    return {
      year: d.Year,
      x:
        (Math.floor(d.Year / 10) -
          min(data.map((d) => Math.floor(d.Year / 10)))) %
          2 ===
        0
          ? xScale(d.Year % 10)
          : xScale(9 - (d.Year % 10)),
      // reverse the y scale for every other decade - found by subtracting each decade from the first decade & determining if even or odd
      y: yScale(Math.floor(d.Year / 10)),
    };
  });
</script>

<div class="chart" bind:clientWidth={width} bind:clientHeight={height}>
  {#if width && height}
    <svg {width} {height}>
      <TimeLineHorizontal {timelineData} {height} {width} />
      {#each renderedData as { movie, x, y, budget, boxoffice, rating, strokeWidth, strokeLength, year, minYear }}
        <Bubble
          {movie}
          {x}
          {y}
          {budget}
          {boxoffice}
          {rating}
          {strokeWidth}
          {strokeLength}
          {year}
          {minYear}
        />
      {/each}
    </svg>
  {/if}
</div>

<style>
  .chart {
    flex: 1;
    width: 100%;
    /* height: 100%;  */
    overflow: hidden;
  }
  /* svg {
        background: red;
    } */
</style>
