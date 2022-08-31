<script>
  import { max, arc, curveBasis } from "d3";

  export let movie;
  export let x;
  export let y;
  export let budget;
  export let boxoffice;
  export let rating;
  //   export let strokeNum;
  export let strokeWidth;
  export let strokeLength;
  export let year;
  export let minYear;
  export let maxYear;

  export let state;
  export let colorScheme;

  let hovering;

  let strokeNum = 40;
  let padding = 4;
  const fontSize = strokeLength + 1;

  let defaultMovie = "Default";

  $: ratingArr = [
    ...Array(Math.round((rating / 100) * strokeNum)).fill(1),
  ].concat([
    ...Array(strokeNum - Math.round((rating / 100) * strokeNum)).fill(0),
  ]);

  // arc generator to draw circle textPath for movie names
  $: arcGenerator = arc()
    .innerRadius(0)
    .outerRadius(max([budget, boxoffice]) + padding + strokeLength)
    .startAngle(-Math.PI)
    .endAngle(2 * Math.PI);

  function enter() {
    hovering = true;
    state = movie;
  }

  function leave() {
    hovering = false;
    state = defaultMovie;
  }
</script>

<g>
  <g on:mouseenter={enter} on:mouseleave={leave}>
    <!-- draw white circle under actual circles to prevent timeline being seen through gaps in strokes  -->
    <circle
      cx={x}
      cy={y}
      r={max([budget, boxoffice]) + padding + strokeLength}
      fill="white"
    />
    <!-- draw smaller circle on top of larger -->
    {#if budget > boxoffice}
      <circle
        class="budget-circle"
        cx={x}
        cy={y}
        r={budget}
        fill={colorScheme.Budget}
      />
      <circle
        class="boxoffice-circle"
        cx={x}
        cy={y - boxoffice + budget}
        r={boxoffice}
        fill={colorScheme.BoxOff}
      />
    {:else}
      <circle
        class="boxoffice-circle"
        cx={x}
        cy={y}
        r={boxoffice}
        fill={colorScheme.BoxOff}
      />
      <circle
        class="budget-circle"
        cx={x}
        cy={y - budget + boxoffice}
        r={budget}
        fill={colorScheme.Budget}
      />
    {/if}
    {#each ratingArr as val, idx}
      <line
        x1={x +
          (max([budget, boxoffice]) + padding) *
            Math.cos(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        y1={y +
          (max([budget, boxoffice]) + padding) *
            Math.sin(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        x2={x +
          (max([budget, boxoffice]) + strokeLength) *
            Math.cos(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        y2={y +
          (max([budget, boxoffice]) + strokeLength) *
            Math.sin(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        stroke={val === 1 ? colorScheme.StrokeFilled : colorScheme.StrokeEmpty}
        stroke-width={strokeWidth}
        stroke-linecap="round"
      />
    {/each}
  </g>
  <!-- group for movie name -->
  <g transform={`translate(${x},${y})`}>
    <!-- arc path to append textPath - to get text in an arc -->
    <path d={arcGenerator(x)} fill="none" id={`bubble-${movie}`} />
    <!-- white background for text - so timeline doesn't seem to pass through text -->
    <text
      dy="-3"
      font-size={fontSize}
      stroke="white"
      fill="white"
      stroke-width="5"
      stroke-linejoin="round"
    >
      <textPath
        xlink:href={`#bubble-${movie}`}
        startOffset="50%"
        text-anchor="middle">{movie}</textPath
      >
    </text>
    <text dy="-3" font-size={fontSize} fill={colorScheme.Timeline}>
      <textPath
        xlink:href={`#bubble-${movie}`}
        startOffset="50%"
        text-anchor="middle">{movie}</textPath
      >
    </text></g
  >
  {#if year === minYear || year === maxYear}
    <text
      {x}
      y={y + max([budget, boxoffice]) * 2 + padding + strokeLength}
      text-anchor="middle"
      fill={colorScheme.Timeline}
      class="year-text">{year}</text
    >
  {/if}
</g>

<style>
  text {
    font-family: "Lucida Sans", "Lucida Sans Regular", "Lucida Grande",
      "Lucida Sans Unicode", Geneva, Verdana, sans-serif;
  }
  .year-text {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }
  .tooltip {
    /* display: none;
    opacity: 0;
    pointer-events: none; */
    position: absolute;
    background: #2d426a;
    padding: 12px;
    color: #ffffff;
    border-radius: 4px;
    font-size: 11px;
    left: 0px;
    top: 0px;
    overflow-wrap: break-word;
    z-index: 9999;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
</style>
