const layout = require("./layout");
const { renderModules } = require("./moduleRenderer");
const { SITE_URL } = require("../config/site");

module.exports = (page, navPages = [], settings = {}, navItems = [], context = {}) => {

  const pageSettings = page.metaDescription ? { ...settings, metaDescription: page.metaDescription } : settings;

  const pageMeta = { url: `${SITE_URL}/p/${page.slug}`, path: `/p/${page.slug}` };

  const sectionHtml = `
<section class="section narrow">

    <div class="section-head">

        <h2 id="live-title" class="collection-list-title collection-list-title--${page.titleSize || "medium"}">
            ${page.title}
        </h2>

        ${page.subtitle ? `<p class="collection-list-subtitle">${page.subtitle}</p>` : ""}

    </div>

    ${renderModules(page.modules, context)}

</section>
`;

  return layout(
    page.title,
    page.backgroundImage
      ? `<div class="page-bg-wrap" style="background-image:url('${page.backgroundImage}');">${sectionHtml}</div>`
      : sectionHtml,
    navPages,
    pageSettings,
    navItems,
    pageMeta
  );

};
