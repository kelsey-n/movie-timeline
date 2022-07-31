<script>
  import { min, max } from "d3";

  import data from "./data";

  import Chart from "./components/Chart.svelte";
  import ChartHorizontal from "./components/ChartHorizontal.svelte";

  let width;
  let height;

  let movies = data.map((d) => d.Movie);
  let stateWrapper = "";
  $: imgNum = movies.indexOf(stateWrapper);
</script>

<div
  class="wrapper {`wrapper${imgNum}`}"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  {#if height > width}
    <Chart
      {data}
      xRange={[
        min(data.map((d) => Math.floor(d.Year / 10))),
        max(data.map((d) => Math.floor(d.Year / 10))),
      ]}
      yRange={[0, 9]}
      circleDomain={[
        //min(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
        0,
        max(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
      ]}
    />
  {:else}
    <ChartHorizontal
      bind:stateWrapper
      {data}
      xRange={[0, 9]}
      yRange={[
        min(data.map((d) => Math.floor(d.Year / 10))),
        max(data.map((d) => Math.floor(d.Year / 10))),
      ]}
      circleDomain={[
        // min(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
        0,
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

  .wrapper::before {
    content: "";
    background: none;
    background-repeat: no-repeat;
    background-position: center;
    background-position-y: 0%;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper0::before {
    content: "";
    background: url("  https://live.staticflickr.com/65535/52237731696_042c9df85d_z.jpg");
    background-repeat: no-repeat;
    background-position: center;
    background-position-y: 0%;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.3;
  }

  .wrapper1::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52231419199_7245107d9d_z.jpg");
    background-repeat: no-repeat;
    background-position: center;
    background-position-y: 0%;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.3;
  }

  .wrapper3::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52238263810_c392bc7dc9_z.jpg");
    background-repeat: no-repeat;
    background-position: center;
    background-position-y: 0%;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.3;
  }

  .wrapper7::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52230771980_4e9fb1051b_z.jpg");
    background-repeat: no-repeat;
    background-position: center;
    background-position-y: 0%;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.3;
  }
</style>
