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

  let strokeNum = 40;
  let padding = 4;

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

  // arc generator to draw circle textPath for min year
  $: arcGeneratorMinYear = arc()
    .innerRadius(0)
    .outerRadius(max([budget, boxoffice]) + 3 * (padding + strokeLength))
    .startAngle(-Math.PI / 2)
    .endAngle(-2 * Math.PI);
</script>

<g>
  <!-- draw white circle under actual circles to prevent timeline being seen through gaps in strokes  -->
  <circle
    cx={x}
    cy={y}
    r={max([budget, boxoffice]) + padding + strokeLength}
    fill="white"
  />
  <!-- draw smaller circle on top of larger -->
  {#if budget > boxoffice}
    <circle class="budget-circle" cx={x} cy={y} r={budget} />
    <circle
      class="boxoffice-circle"
      cx={x}
      cy={y - boxoffice + budget}
      r={boxoffice}
    />
  {:else}
    <circle class="boxoffice-circle" cx={x} cy={y} r={boxoffice} />
    <circle
      class="budget-circle"
      cx={x}
      cy={y - budget + boxoffice}
      r={budget}
    />
  {/if}
  {#each ratingArr as val, idx}
    <line
      class={val === 1 ? "filled-stroke" : "empty-stroke"}
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
      stroke="black"
      stroke-width={strokeWidth}
      stroke-linecap="round"
    />
  {/each}
  <!-- group for movie name -->
  <g transform={`translate(${x},${y})`}>
    <!-- arc path to append textPath - to get text in an arc -->
    <path d={arcGenerator(x)} fill="none" id={`bubble-${movie}`} />
    <!-- white background for text - so timeline doesn't seem to pass through text -->
    <text
      dy="-3"
      font-size={strokeLength + 2}
      fill="none"
      stroke="white"
      stroke-width="7"
    >
      <textPath
        xlink:href={`#bubble-${movie}`}
        startOffset="50%"
        text-anchor="middle">{movie}</textPath
      >
    </text>
    <text dy="-3" font-size={strokeLength}>
      <textPath
        xlink:href={`#bubble-${movie}`}
        startOffset="50%"
        text-anchor="middle">{movie}</textPath
      >
    </text>
  </g>
  {#if year === minYear}
    <text
      {x}
      y={y + max([budget, boxoffice]) * 2 + padding + strokeLength}
      text-anchor="middle"
      fill="red">{year}</text
    >
  {/if}
</g>

<style>
  .budget-circle {
    fill: lightsalmon;
  }

  .boxoffice-circle {
    fill: lightseagreen;
  }

  .filled-stroke {
    stroke: black;
  }

  .empty-stroke {
    stroke: lightgray;
  }
</style>
