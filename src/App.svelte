<script>
    import { min, max } from 'd3';

	import data from './data'

	import Chart from './components/Chart.svelte'
</script>

<div class="wrapper">
	<Chart 
		data={data}
		xRange={[min(data.map(d => Math.floor(d.Year/10) )), max(data.map(d => Math.floor(d.Year/10) ))]}
		yRange={[0, 9]}
		circleRange={[min(data.map(d => [d.Budget, d.BoxOffice]).flat()), max(data.map(d => [d.Budget, d.BoxOffice]).flat())]}
	/>
</div>

<style>
	.wrapper {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
	}
</style>