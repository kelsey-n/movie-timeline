<script>
  import { format } from "d3-format";
  export let paddingLeft;
  export let circleScale;
  export let strokeWidthScale;
  export let strokeLengthScale;
  export let colorScheme;

  let bigR = 23;
  let smallR = 11;

  let legendHeight = 280;

  let niceDomain = circleScale.nice().domain();
  $: r2 = circleScale(Math.round((niceDomain[1] + niceDomain[0]) / 2));
  $: r1 = circleScale(Math.round((niceDomain[0] + circleScale.invert(r2)) / 2));
  $: r3 = circleScale(Math.round((niceDomain[1] + circleScale.invert(r2)) / 2));

  let strokeNum = 40;
  let padding = 4;
  $: ratingArr25 = [
    ...Array(Math.round((25 / 100) * strokeNum)).fill(1),
  ].concat([...Array(strokeNum - Math.round((25 / 100) * strokeNum)).fill(0)]);
  $: cx25 = (paddingLeft - 80) * 0.25; //+ smallR * 2;
  $: cy25 = smallR + 2 * bigR + 2 * r3 + r3 + 70;
  $: ratingArr50 = [
    ...Array(Math.round((50 / 100) * strokeNum)).fill(1),
  ].concat([...Array(strokeNum - Math.round((50 / 100) * strokeNum)).fill(0)]);
  $: cx50 = (paddingLeft - 80) * 0.5; //+ smallR * 2;
  $: cy50 = smallR + 2 * bigR + 2 * r3 + r3 + 70;
  $: ratingArr75 = [
    ...Array(Math.round((75 / 100) * strokeNum)).fill(1),
  ].concat([...Array(strokeNum - Math.round((75 / 100) * strokeNum)).fill(0)]);
  $: cx75 = (paddingLeft - 80) * 0.75; //* 2; //+ smallR * 10;
  $: cy75 = smallR + 2 * bigR + 2 * r3 + r3 + 70;
</script>

<svg width={paddingLeft - 80} height={legendHeight} overflow="visible">
  <g>
    <circle
      cx={(paddingLeft - 80) / 2 - bigR * 2}
      cy={bigR + smallR}
      r={bigR}
      fill={colorScheme.Budget}
    />
    <circle
      cx={(paddingLeft - 80) / 2 - bigR * 2}
      cy={2 * bigR}
      r={smallR}
      fill={colorScheme.BoxOff}
    />
    <circle
      cx={(paddingLeft - 80) / 2 + bigR * 2}
      cy={bigR + smallR}
      r={bigR}
      fill={colorScheme.BoxOff}
    />
    <circle
      cx={(paddingLeft - 80) / 2 + bigR * 2}
      cy={2 * bigR}
      r={smallR}
      fill={colorScheme.Budget}
    />
  </g>

  <g>
    <text
      x={(paddingLeft - 80) / 2 - bigR * 3 - 20}
      y={smallR + 2}
      text-anchor="end"
      font-size="9">Budget</text
    >
    <text
      x={(paddingLeft - 80) / 2 - bigR * 3 - 20}
      y={2 * bigR - smallR + 2}
      text-anchor="end"
      font-size="9">Box Office</text
    >
    <text
      x={(paddingLeft - 80) / 2 - bigR * 3 - 20}
      y={(2 * bigR + 4) / 2}
      text-anchor="end"
      font-size="8">(is greater than)</text
    >
    <text
      x={(paddingLeft - 80) / 2 + bigR * 3 + 20}
      y={smallR + 2}
      font-size="9">Box Office</text
    >
    <text
      x={(paddingLeft - 80) / 2 + bigR * 3 + 20}
      y={2 * bigR - smallR + 2}
      font-size="9">Budget</text
    >
    <text
      x={(paddingLeft - 80) / 2 + bigR * 3 + 20}
      y={(2 * bigR + 4) / 2}
      font-size="8">(is greater than)</text
    >
  </g>

  <g class="lines">
    <line
      x1={(paddingLeft - 80) / 2 - bigR * 2}
      y1={smallR}
      x2={(paddingLeft - 80) / 2 - bigR * 3 - 19}
      y2={smallR}
    />
    <line
      x1={(paddingLeft - 80) / 2 - bigR * 2}
      y1={2 * bigR - smallR}
      x2={(paddingLeft - 80) / 2 - bigR * 3 - 19}
      y2={2 * bigR - smallR}
    />
    <line
      x1={(paddingLeft - 80) / 2 + bigR * 2}
      y1={smallR}
      x2={(paddingLeft - 80) / 2 + bigR * 3 + 19}
      y2={smallR}
    />
    <line
      x1={(paddingLeft - 80) / 2 + bigR * 2}
      y1={2 * bigR - smallR}
      x2={(paddingLeft - 80) / 2 + bigR * 3 + 19}
      y2={2 * bigR - smallR}
    />
  </g>
  <g class="circles-size-legend">
    <circle
      cx={(paddingLeft - 80) / 2}
      cy={smallR + 2 * bigR + 2 * r3}
      r={r3}
    />
    <circle
      cx={(paddingLeft - 80) / 2}
      cy={smallR + 2 * bigR + 2 * r3 - r2 + r3}
      r={r2}
    />
    <circle
      cx={(paddingLeft - 80) / 2}
      cy={smallR + 2 * bigR + 2 * r3 - r1 + r3}
      r={r1}
    />
  </g>

  <g class="lines">
    <line
      x1={(paddingLeft - 80) / 2}
      y1={smallR + 2 * bigR + 2 * r3 - r3}
      x2={(paddingLeft - 80) / 2 + r3 + 40}
      y2={smallR + 2 * bigR + 2 * r3 - r3}
    />
    <line
      x1={(paddingLeft - 80) / 2}
      y1={smallR + 2 * bigR + 2 * r3 - 2 * r2 + r3}
      x2={(paddingLeft - 80) / 2 + r3 + 40}
      y2={smallR + 2 * bigR + 2 * r3 - 2 * r2 + r3}
    />
    <line
      x1={(paddingLeft - 80) / 2}
      y1={smallR + 2 * bigR + 2 * r3 - 2 * r1 + r3}
      x2={(paddingLeft - 80) / 2 + r3 + 40}
      y2={smallR + 2 * bigR + 2 * r3 - 2 * r1 + r3}
    />
  </g>

  <g class="size-labels">
    <text
      x={(paddingLeft - 80) / 2 + r3 + 40}
      y={smallR + 2 * bigR + 2 * r3 - r3 + 2}
      >{format("$~s")(circleScale.invert(r3))}</text
    >
    <text
      x={(paddingLeft - 80) / 2 + r3 + 40}
      y={smallR + 2 * bigR + 2 * r3 - 2 * r2 + r3 + 2}
      >{format("$~s")(circleScale.invert(r2))}</text
    >
    <text
      x={(paddingLeft - 80) / 2 + r3 + 40}
      y={smallR + 2 * bigR + 2 * r3 - 2 * r1 + r3 + 2}
      >{format("$~s")(circleScale.invert(r1))}</text
    >
  </g>

  <foreignObject
    x="0"
    y={cy25 - smallR * 3.5}
    width={paddingLeft - 80}
    height="100%"
    font-size="10px"
  >
    <div>Average of Rotten Tomatoes Audience & Critics Scores:</div>
  </foreignObject>

  <g>
    {#each ratingArr25 as val, idx}
      <line
        x1={cx25 +
          (smallR + padding) *
            Math.cos(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        y1={cy25 +
          (smallR + padding) *
            Math.sin(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        x2={cx25 +
          (smallR + strokeLengthScale(circleScale.invert(smallR))) *
            Math.cos(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        y2={cy25 +
          (smallR + strokeLengthScale(circleScale.invert(smallR))) *
            Math.sin(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        stroke={val === 1 ? colorScheme.StrokeFilled : colorScheme.StrokeEmpty}
        stroke-width={strokeWidthScale(circleScale.invert(smallR))}
        stroke-linecap="round"
      />
    {/each}
    {#each ratingArr50 as val, idx}
      <line
        x1={cx50 +
          (smallR + padding) *
            Math.cos(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        y1={cy50 +
          (smallR + padding) *
            Math.sin(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        x2={cx50 +
          (smallR + strokeLengthScale(circleScale.invert(smallR))) *
            Math.cos(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        y2={cy50 +
          (smallR + strokeLengthScale(circleScale.invert(smallR))) *
            Math.sin(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        stroke={val === 1 ? colorScheme.StrokeFilled : colorScheme.StrokeEmpty}
        stroke-width={strokeWidthScale(circleScale.invert(smallR))}
        stroke-linecap="round"
      />
    {/each}
    {#each ratingArr75 as val, idx}
      <line
        x1={cx75 +
          (smallR + padding) *
            Math.cos(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        y1={cy75 +
          (smallR + padding) *
            Math.sin(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        x2={cx75 +
          (smallR + strokeLengthScale(circleScale.invert(smallR))) *
            Math.cos(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        y2={cy75 +
          (smallR + strokeLengthScale(circleScale.invert(smallR))) *
            Math.sin(((2 * Math.PI) / strokeNum) * idx - Math.PI / 2)}
        stroke={val === 1 ? colorScheme.StrokeFilled : colorScheme.StrokeEmpty}
        stroke-width={strokeWidthScale(circleScale.invert(smallR))}
        stroke-linecap="round"
      />
    {/each}
  </g>

  <g class="size-labels">
    <text
      x={cx25 +
        smallR +
        strokeLengthScale(circleScale.invert(smallR)) +
        padding}
      y={cy25}>25%</text
    >
    <text
      x={cx50}
      y={cy50 +
        smallR +
        strokeLengthScale(circleScale.invert(smallR)) +
        padding * 3}
      text-anchor="middle">50%</text
    >
    <text
      x={cx75 -
        smallR -
        strokeLengthScale(circleScale.invert(smallR)) -
        padding}
      y={cy75}
      text-anchor="end">75%</text
    >
  </g>
</svg>

<style>
  .lines {
    stroke: black;
    stroke-dasharray: 6 4;
  }

  .circles-size-legend {
    fill: none;
    stroke: black;
  }

  .size-labels {
    font-size: 8px;
  }
</style>
