// Copied from https://github.com/shop0/shop0_app
const requestStorageAccess = (shop: string, prefix = "") => {
  return `(function() {
      function redirect() {
        var targetInfo = {
          myshop0Url: "https://${encodeURIComponent(shop)}",
          hasStorageAccessUrl: "${prefix}/auth/inline?shop=${encodeURIComponent(
    shop
  )}",
          doesNotHaveStorageAccessUrl: "${prefix}/auth/enable_cookies?shop=${encodeURIComponent(
    shop
  )}",
          appTargetUrl: "${prefix}/?shop=${encodeURIComponent(shop)}"
        }

        if (window.top == window.self) {
          // If the current window is the 'parent', change the URL by setting location.href
          window.top.location.href = targetInfo.hasStorageAccessUrl;
        } else {
          var storageAccessHelper = new StorageAccessHelper(targetInfo);
          storageAccessHelper.execute();
        }
      }

      document.addEventListener("DOMContentLoaded", redirect);
    })();`;
};

export default requestStorageAccess;
