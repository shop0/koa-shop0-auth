// Copied from https://github.com/shop0/shop0_app
const topLevelInteraction = (shop: string, prefix = "") => {
  return `(function() {
      function setUpTopLevelInteraction() {
        var TopLevelInteraction = new ITPHelper({
          redirectUrl: "${prefix}/auth?shop=${encodeURIComponent(shop)}",
        });

        TopLevelInteraction.execute();
      }

      document.addEventListener("DOMContentLoaded", setUpTopLevelInteraction);
    })();`;
};

export default topLevelInteraction;
