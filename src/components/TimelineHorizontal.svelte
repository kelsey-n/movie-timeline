<script>
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { line, curveBasis, min, max } from "d3";
  import { interpolatePath } from "d3-interpolate-path";

  export let timelineData;
  export let height;
  export let width;

  const lineGenerator = line()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveBasis);

  const tLinePath = tweened(null, {
    duration: 400,
    // easing: cubicOut,
    interpolate: interpolatePath,
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

  $: linePath = lineGenerator(timelineData);
  $: tLinePath.set(linePath);
</script>

<path class="line" d={linePath} />
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
        fill="red">{year}</textPath
      >
    </text>
  {/if}
{/each}

<style>
  .line {
    fill: none;
    stroke: #e64415;
    stroke-width: 2;
  }
</style>
