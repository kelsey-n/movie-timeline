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
    background: url("https://live.staticflickr.com/65535/52254412885_eefa510490_c.jpg");
    /* background: url("https://live.staticflickr.com/65535/52253949498_b0cc054217_b.jpg"); */
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper1::before {
    content: "";
    /* background: url("https://live.staticflickr.com/65535/52231419199_7245107d9d_z.jpg"); */
    background: url("https://live.staticflickr.com/65535/52253957596_c4011616c4_c.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper2::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52254058613_a6655537c6_c.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper3::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52254108868_b6ae0fd847_c.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper4::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52254405049_6bd82691dd_c.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper5::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52254077238_042d4ffc18_c.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper6::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52254536731_59c6397363_c.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper7::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52254100516_fc74ea4dae_c.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper8::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52254594018_cf22b0b474_c.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }

  .wrapper9::before {
    content: "";
    background: url("https://live.staticflickr.com/65535/52255100190_98fde545bc_z.jpg");
    background-repeat: no-repeat;
    background-position: center top;
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    opacity: 0.5;
  }
</style>
