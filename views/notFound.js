const layout = require("./layout");

module.exports = (navPages = [], settings = {}, navItems = []) =>
  layout(
    "找不到頁面",
    `
<section class="section narrow">

    <div class="section-head">

        <h2>
            找不到這個頁面
        </h2>

    </div>

    <p class="story-intro">
        <a href="/">回到首頁</a>
    </p>

</section>
`,
    navPages,
    settings,
    navItems
  );
