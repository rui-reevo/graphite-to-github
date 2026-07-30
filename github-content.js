// Maps a GitHub PR URL to the corresponding Graphite PR URL.
// GitHub:   https://github.com/{org}/{repo}/pull/{number}
// Graphite: https://app.graphite.com/github/pr/{org}/{repo}/{number}
function githubToGraphite(href) {
  const match = href.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (!match) return null;
  const [, org, repo, number] = match;
  return `https://app.graphite.com/github/pr/${org}/${repo}/${number}`;
}

const BUTTON_ID = "gh-to-graphite-button";

// Graphite's official hexagonal logo mark (extracted from app.graphite.com).
const GRAPHITE_MARK =
  '<svg class="gh2g-mark" viewBox="0 0 28 28" width="13" height="13" aria-hidden="true">' +
  '<path fill="currentColor" d="m20.704 7.123-9.27-2.484-6.788 6.793 2.482 9.276 9.27 2.484 6.788-6.793-2.482-9.276Z"/>' +
  '<path fill="currentColor" d="M17.644 0 3.73 3.729 0 17.644l10.187 10.187 13.915-3.729 3.73-13.915L17.643 0Zm2.27 24.312H7.917L1.92 13.915 7.917 3.518h11.997l5.998 10.397-5.998 10.397Z"/>' +
  "</svg>";

// External-link arrow — signals the link opens off-site.
const EXTERNAL_ARROW =
  '<svg class="gh2g-arrow" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">' +
  '<path fill="currentColor" d="M5.5 3.5a.75.75 0 000 1.5h4.44L3.22 11.72a.75.75 0 101.06 1.06L11 6.06v4.44a.75.75 0 001.5 0v-6a.75.75 0 00-.75-.75h-6z"/>' +
  "</svg>";

// The visible "#123" span in the PR header — we insert the button right after
// it. GitHub used to render it inside the title h1 and now renders it in a
// sibling suffix span, so we search the h1's container rather than the h1
// itself. The h1's data-component attribute is stable; the surrounding CSS
// module class names are hashed per deploy, so we don't rely on them.
function findAnchor() {
  const titleArea = document.querySelector(
    'h1[data-component="PH_Title"]'
  )?.parentElement;
  return titleArea?.querySelector(".fgColor-muted") || null;
}

function buildButton(graphiteUrl) {
  const button = document.createElement("a");
  button.id = BUTTON_ID;
  button.target = "_blank";
  button.rel = "noopener noreferrer";
  button.title = "Open this PR on Graphite";
  button.href = graphiteUrl;
  button.className = "gh2g-inline";
  button.innerHTML = GRAPHITE_MARK + "<span>Graphite</span>" + EXTERNAL_ARROW;
  return button;
}

function syncButton() {
  const graphiteUrl = githubToGraphite(location.href);
  const button = document.getElementById(BUTTON_ID);

  // Not on a PR page — remove the button if it exists.
  if (!graphiteUrl) {
    if (button) button.remove();
    return;
  }

  // Wait for the title h1 to render.
  const anchor = findAnchor();
  if (!anchor) return;

  if (!button) {
    anchor.insertAdjacentElement("afterend", buildButton(graphiteUrl));
  } else if (button.href !== graphiteUrl) {
    button.href = graphiteUrl;
  }
}

// GitHub is a Turbo/Pjax app — navigations happen without full reloads.
function watchChanges() {
  let lastHref = location.href;
  const check = () => {
    if (location.href !== lastHref) lastHref = location.href;
    syncButton();
  };

  // Catch SPA navigations via the History API.
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      check();
      return result;
    };
  }
  window.addEventListener("popstate", check);

  // The title h1 renders asynchronously after navigation, so watch the DOM.
  const observer = new MutationObserver(() => {
    if (!document.getElementById(BUTTON_ID)) syncButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback poll to handle edge cases.
  setInterval(check, 1000);
}

syncButton();
watchChanges();
