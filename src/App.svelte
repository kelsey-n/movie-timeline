<script>
  import { min, max } from "d3";

  import data from "./data";

  import Chart from "./components/Chart.svelte";
  import ChartHorizontal from "./components/ChartHorizontal.svelte";

  let width;
  let height;
</script>

<div class="wrapper" bind:clientWidth={width} bind:clientHeight={height}>
  {#if height > width}
    <Chart
      {data}
      xRange={[
        min(data.map((d) => Math.floor(d.Year / 10))),
        max(data.map((d) => Math.floor(d.Year / 10))),
      ]}
      yRange={[0, 9]}
      circleRange={[
        min(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
        max(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
      ]}
    />
  {:else}
    <ChartHorizontal
      {data}
      xRange={[0, 9]}
      yRange={[
        min(data.map((d) => Math.floor(d.Year / 10))),
        max(data.map((d) => Math.floor(d.Year / 10))),
      ]}
      circleRange={[
        min(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
        max(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
      ]}
    />
  {/if}
</div>

<style>
  .wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }
</style>
