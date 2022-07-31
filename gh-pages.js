var ghpages = require("gh-pages");

ghpages.publish(
  "public", // path to public directory
  {
    branch: "gh-pages",
    repo: "https://github.com/kelsey-n/movie-timeline", // Update to point to your repository
    user: {
      name: "Kelsey Nanan", // update to use your name
      email: "kan317@nyu.edu", // Update to use your email
    },
  },
  () => {
    console.log("Deploy Complete!");
  }
);
