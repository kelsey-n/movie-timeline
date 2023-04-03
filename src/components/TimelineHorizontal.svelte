<script>
  import { tweened } from "svelte/motion";
  import { cubicOut, quintOut } from "svelte/easing";
  import { draw } from "svelte/transition";
  import { line, curveBasis, min, max } from "d3";
  import { interpolatePath } from "d3-interpolate-path";

  export let timelineData;
  export let width;
  export let colorScheme;
  export let hoveredYear;

  const lineGenerator = line()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveBasis);

  const tLinePath = tweened(null, {
    duration: 1500,
    easing: quintOut,
    // interpolate: interpolatePath,
  });

  $: for (let i = 0; i < timelineData.length - 1; i++) {
    if (timelineData[i + 1].x === timelineData[i].x) {
      timelineData.splice(i + 1, 0, {
        year: 0,
        x:
          timelineData[i].x > width / 2
            ? timelineData[i].x + 50
            : timelineData[i].x - 50, //TODO: MAKE 50 DYNAMIC (?)
        y: (timelineData[i].y + timelineData[i + 1].y) / 2,
      });
    }
  }

  // create two line paths - for timeline data before/after the hovered year
  // each will have its own transition upon hovering on a movie
  $: hoveredYearIndex =
    timelineData.findIndex((d) => d.year === hoveredYear) + 1;
  $: linePath = lineGenerator(timelineData);
  $: linePath1 = lineGenerator(
    timelineData.slice(0, hoveredYearIndex).reverse()
  );
  $: linePath2 = lineGenerator(
    timelineData.slice(-(timelineData.length - hoveredYearIndex + 1))
  );
</script>

{#if hoveredYear}
  <path
    in:draw={tLinePath}
    class="line"
    stroke={colorScheme.Timeline}
    d={linePath1}
  />
  <path
    in:draw={tLinePath}
    class="line"
    stroke={colorScheme.Timeline}
    d={linePath2}
  />
{:else}
  <path class="line" stroke={colorScheme.Timeline} d={linePath} />
{/if}
{#each timelineData as { x, y, year }, idx}
  {#if year % 10 === 0 && year !== 0 && idx !== 0}
    <path
      d={x > width / 2
        ? lineGenerator([
            timelineData[idx + 1],
            timelineData[idx],
            timelineData[idx - 1],
            timelineData[idx - 2],
            timelineData[idx - 3],
          ])
        : lineGenerator([
            timelineData[idx - 3],
            timelineData[idx - 2],
            timelineData[idx - 1],
            timelineData[idx],
            timelineData[idx + 1],
          ])}
      id={`timeline${idx}`}
      fill="none"
    />
    <text dy="-5">
      <textPath
        xlink:href={`#timeline${idx}`}
        text-anchor="middle"
        startOffset={x > width / 2 ? "25%" : "75%"}
        stroke="white"
        fill="white"
        stroke-width="5"
        stroke-linejoin="round">{year}</textPath
      >
    </text>
    <text dy="-5">
      <textPath
        xlink:href={`#timeline${idx}`}
        text-anchor="middle"
        startOffset={x > width / 2 ? "25%" : "75%"}
        fill={colorScheme.Timeline}>{year}</textPath
      >
    </text>
  {/if}
{/each}

<style>
  .line {
    fill: none;
    stroke-width: 2;
  }
</style>
